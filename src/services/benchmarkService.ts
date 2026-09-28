import { api } from './apiClient';
import monitoringService, { type MonitoringFullData } from './monitoringService';
import { listGpus } from '../utils/gpuUtils';
import { readGpuDetails } from '../utils/gpuDetails';
import { readInference, type InferenceSnapshot } from '../utils/inferenceSnapshot';

export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkActive: boolean;
  uptime: string;
  uptimeSeconds: number;
  totalMemory: string;
  usedMemory: string;
  freeMemory: string;
}

export interface MonitoringData extends MonitoringFullData {
  training: MonitoringFullData['training'] & { active?: number };
}

export interface GpuLiveRow {
  key: string;
  index: number;
  name: string;
  usedGb: number;
  totalGb: number;
  temperature: number;
  utilization: number;
  powerDraw: number;
  fanSpeed: number;
  memoryClock: number | null;
  coreClock: number | null;
  memoryClockMax: number | null;
  coreClockMax: number | null;
}

export interface InferenceHistoryPoint {
  time: string;
  timestamp: string;
  genTps: number | null;
  promptTps: number | null;
  ttftMs: number | null;
  latencyMs: number | null;
}

export interface BenchmarkSnapshot {
  gpus: GpuLiveRow[];
  inference: InferenceSnapshot;
  timestamp: string;
}

export interface BenchmarkStats {
  avgGenTps: number | null;
  maxGenTps: number | null;
  avgPromptTps: number | null;
  avgLatencyMs: number | null;
  avgTtftMs: number | null;
  avgTemperature: number;
  maxTemperature: number;
  avgUtilization: number;
  peakPowerDraw: number;
  totalSamples: number;
  activeDevices: number;
  lastUpdated: string;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gpuRowFromStat(
  key: string,
  index: number,
  stat: Record<string, unknown>,
): GpuLiveRow {
  const details = readGpuDetails(stat);
  const usedMb = typeof stat.used_mb === 'number' ? stat.used_mb : null;
  const totalMb = typeof stat.total_mb === 'number' ? stat.total_mb : null;
  const used = typeof stat.used === 'number' ? stat.used : usedMb !== null ? usedMb / 1024 : 0;
  const total = typeof stat.total === 'number' ? stat.total : totalMb !== null ? totalMb / 1024 : 0;
  const name = typeof stat.name === 'string' && stat.name ? stat.name : `GPU ${index}`;

  return {
    key,
    index,
    name: `${name} (GPU ${index})`,
    usedGb: used,
    totalGb: total,
    temperature: typeof stat.temperature === 'number' ? stat.temperature : 0,
    utilization: typeof stat.utilization === 'number' ? stat.utilization : 0,
    powerDraw: details.power.draw ?? 0,
    fanSpeed: typeof stat.fan === 'number' ? stat.fan : 0,
    memoryClock: details.clocks.memory.current,
    coreClock: details.clocks.core.current,
    memoryClockMax: details.clocks.memory.max,
    coreClockMax: details.clocks.core.max,
  };
}

class RealBenchmarkService {
  private gpuLatest: GpuLiveRow[] = [];
  private inference: InferenceSnapshot = readInference({ available: false });
  private inferenceHistory: InferenceHistoryPoint[] = [];
  private statsCache: BenchmarkStats | null = null;
  private lastFetchTime = 0;
  private abortController: AbortController | null = null;
  private inflightMonitoringRequest: Promise<MonitoringData> | null = null;
  private maxHistorySize = 100;

  async fetchMonitoringData(): Promise<MonitoringData> {
    if (this.inflightMonitoringRequest) {
      return this.inflightMonitoringRequest;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.inflightMonitoringRequest = (async () => {
      try {
        const data = await monitoringService.getFull(signal);
        this.lastFetchTime = Date.now();

        if (!data.success) {
          throw new Error(data.error || 'API returned unsuccessful response');
        }

        return data;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Request cancelled');
        }
        throw error;
      } finally {
        this.inflightMonitoringRequest = null;
        this.abortController = null;
      }
    })();

    return this.inflightMonitoringRequest;
  }

  async fetchSystemStats(): Promise<SystemStats> {
    const data = await api<{ success: boolean; system?: SystemStats }>('/finetune/system-stats');
    if (data.success && data.system) return data.system;
    throw new Error('API returned неуспешный ответ или отсутствуют данные');
  }

  async fetchRealBenchmarkData(): Promise<BenchmarkSnapshot> {
    const monitoringData = await this.fetchMonitoringData();
    const gpus = listGpus(monitoringData.gpu).map(({ key, index, stat }) =>
      gpuRowFromStat(key, index, stat as Record<string, unknown>),
    );
    const inference = readInference(monitoringData.inference);
    const timestamp = monitoringData.timestamp || new Date().toISOString();

    this.gpuLatest = gpus;
    this.inference = inference;
    this.inferenceHistory = [
      ...this.inferenceHistory,
      {
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp,
        genTps: inference.available ? inference.genTps : null,
        promptTps: inference.available ? inference.promptTps : null,
        ttftMs: inference.available ? inference.ttftMs : null,
        latencyMs: inference.available ? inference.latencyMs : null,
      },
    ].slice(-this.maxHistorySize);
    this.calculateStats();

    return { gpus, inference, timestamp };
  }

  private calculateStats(): void {
    const gen = this.inferenceHistory.map((point) => point.genTps).filter((value): value is number => value !== null);
    const prompt = this.inferenceHistory.map((point) => point.promptTps).filter((value): value is number => value !== null);
    const latency = this.inferenceHistory.map((point) => point.latencyMs).filter((value): value is number => value !== null);
    const ttft = this.inferenceHistory.map((point) => point.ttftMs).filter((value): value is number => value !== null);

    this.statsCache = {
      avgGenTps: mean(gen),
      maxGenTps: gen.length > 0 ? Math.max(...gen) : null,
      avgPromptTps: mean(prompt),
      avgLatencyMs: mean(latency),
      avgTtftMs: mean(ttft),
      avgTemperature: mean(this.gpuLatest.map((gpu) => gpu.temperature)) ?? 0,
      maxTemperature: this.gpuLatest.reduce((max, gpu) => Math.max(max, gpu.temperature), 0),
      avgUtilization: mean(this.gpuLatest.map((gpu) => gpu.utilization)) ?? 0,
      peakPowerDraw: this.gpuLatest.reduce((max, gpu) => Math.max(max, gpu.powerDraw), 0),
      totalSamples: this.inferenceHistory.length,
      activeDevices: this.gpuLatest.length,
      lastUpdated: new Date().toLocaleTimeString('ru-RU'),
    };
  }

  getHistory(): InferenceHistoryPoint[] {
    return [...this.inferenceHistory];
  }

  getStats(): BenchmarkStats | null {
    return this.statsCache ? { ...this.statsCache } : null;
  }

  getLatestGpus(): GpuLiveRow[] {
    return [...this.gpuLatest];
  }

  getInference(): InferenceSnapshot {
    return this.inference;
  }

  clearHistory(): void {
    this.inferenceHistory = [];
    this.gpuLatest = [];
    this.inference = readInference({ available: false });
    this.statsCache = null;
  }

  getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.inflightMonitoringRequest = null;
  }
}

export const realBenchmarkService = new RealBenchmarkService();
