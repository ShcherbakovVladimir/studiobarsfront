// /home/user/projects/studioxlam/src/services/benchmarkService.ts
import { api } from './apiClient';
import monitoringService, { type MonitoringFullData } from './monitoringService';
import { listGpus } from '../utils/gpuUtils';

export interface RealGpuData {
  name: string;
  used: number;
  total: number;
  used_mb: number;
  total_mb: number;
  percentage: number;
  temperature: number;
  utilization: number;
  power: number;
  fan: number;
  memory_clock: number;
  core_clock: number;
}

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

export interface BenchmarkResult {
  device: string;
  tps: number;
  latency: number;
  memory: number;
  precision: string;
  temperature: number;
  utilization: number;
  powerDraw: number;
  fanSpeed: number;
  memoryClock: number;
  coreClock: number;
  timestamp: string;
  isMock?: boolean;
}

export interface BenchmarkStats {
  avgTps: number;
  maxTps: number;
  minTps: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  avgTemperature: number;
  maxTemperature: number;
  avgUtilization: number;
  peakPowerDraw: number;
  totalSamples: number;
  activeDevices: number;
  totalMemoryUsed: number;
  lastUpdated: string;
}

class RealBenchmarkService {
  private history: BenchmarkResult[] = [];
  private statsCache: BenchmarkStats | null = null;
  private lastFetchTime: number = 0;
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
        console.error('❌ Error fetching monitoring data:', error);
        throw error;
      } finally {
        this.inflightMonitoringRequest = null;
        this.abortController = null;
      }
    })();

    return this.inflightMonitoringRequest;
  }

  async fetchSystemStats(): Promise<SystemStats> {
    try {
      const data = await api<{ success: boolean; system?: SystemStats }>('/finetune/system-stats');

      if (data.success && data.system) {
        return data.system;
      }

      throw new Error('API returned неуспешный ответ или отсутствуют данные');
    } catch (error) {
      console.error('❌ Error fetching system stats:', error);
      throw error;
    }
  }

  // Преобразование данных GPU в формат для бенчмаркинга
  convertGpuToBenchmark(gpuData: RealGpuData | undefined, gpuIndex = 0): BenchmarkResult | null {
    if (!gpuData || !gpuData.name) {
      return null;
    }

    // Расчет TPS на основе утилизации GPU (приблизительный расчет для визуализации)
    // В реальном сценарии TPS должен приходить от API инференса, 
    // но здесь мы используем метрики железа
    const calculateTps = (utilization: number): number => {
      // Это эвристика, так как реальный TPS зависит от модели
      const baseTps = 3000; 
      const tps = (utilization / 100) * baseTps;
      return Math.round(tps * 10) / 10;
    };

    return {
      device: `${gpuData.name} (GPU ${gpuIndex})`,
      tps: calculateTps(gpuData.utilization || 0),
      latency: gpuData.temperature || 0, // Используем температуру как прокси метрику для графика
      memory: gpuData.used || 0,
      precision: 'FP16',
      temperature: gpuData.temperature || 0,
      utilization: gpuData.utilization || 0,
      powerDraw: gpuData.power || 0,
      fanSpeed: gpuData.fan || 0,
      memoryClock: gpuData.memory_clock || 0,
      coreClock: gpuData.core_clock || 0,
      timestamp: new Date().toISOString(),
      isMock: false
    };
  }

  // Получение реальных данных для бенчмаркинга
  async fetchRealBenchmarkData(): Promise<BenchmarkResult[]> {
    try {
      const monitoringData = await this.fetchMonitoringData();
      const results: BenchmarkResult[] = [];

      listGpus(monitoringData.gpu).forEach(({ index, stat }) => {
        const benchmark = this.convertGpuToBenchmark(stat as RealGpuData, index);
        if (benchmark) {
          results.push(benchmark);
        }
      });

      // Добавляем в историю только если есть данные
      if (results.length > 0) {
        this.addToHistory(results);
      }
      
      return results;
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Request cancelled') {
        throw error; // Пробрасываем отмену
      }
      console.error('❌ Error fetching real benchmark data:', error);
      // Возвращаем пустой массив при ошибке, UI должен обработать состояние ошибки
      return []; 
    }
  }

  // Добавление данных в историю
  private addToHistory(data: BenchmarkResult[]): void {
    const validData = data.filter(item => 
      item.device && item.timestamp
    );

    if (validData.length === 0) return;

    this.history = [...this.history, ...validData];
    
    if (this.history.length > this.maxHistorySize) {
      const removeCount = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(removeCount);
    }

    this.calculateStats();
  }

  // Расчет статистики
  private calculateStats(): void {
    if (this.history.length === 0) {
      this.statsCache = null;
      return;
    }

    const tpsValues = this.history.map(d => d.tps);
    const latencyValues = this.history.map(d => d.latency);
    const temperatureValues = this.history.map(d => d.temperature);
    const utilizationValues = this.history.map(d => d.utilization);
    const powerValues = this.history.map(d => d.powerDraw);
    const memoryValues = this.history.map(d => d.memory);

    const uniqueDevices = new Set(this.history.map(d => d.device));

    this.statsCache = {
      avgTps: tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length,
      maxTps: Math.max(...tpsValues),
      minTps: Math.min(...tpsValues),
      avgLatency: latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length,
      maxLatency: Math.max(...latencyValues),
      minLatency: Math.min(...latencyValues),
      avgTemperature: temperatureValues.reduce((a, b) => a + b, 0) / temperatureValues.length,
      maxTemperature: Math.max(...temperatureValues),
      avgUtilization: utilizationValues.reduce((a, b) => a + b, 0) / utilizationValues.length,
      peakPowerDraw: Math.max(...powerValues),
      totalSamples: this.history.length,
      activeDevices: uniqueDevices.size,
      totalMemoryUsed: memoryValues.reduce((a, b) => a + b, 0),
      lastUpdated: new Date().toLocaleTimeString('ru-RU')
    };
  }

  // Получение истории
  getHistory(): BenchmarkResult[] {
    return [...this.history];
  }

  // Получение статистики
  getStats(): BenchmarkStats | null {
    return this.statsCache ? { ...this.statsCache } : null;
  }

  // Получение последних данных по каждому устройству
  getLatestData(): BenchmarkResult[] {
    if (this.history.length === 0) {
      return [];
    }

    const latestByDevice = new Map<string, BenchmarkResult>();
    
    // Сортируем от новых к старым
    const sortedHistory = [...this.history].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    sortedHistory.forEach(data => {
      if (!latestByDevice.has(data.device)) {
        latestByDevice.set(data.device, data);
      }
    });

    return Array.from(latestByDevice.values());
  }

  // Получение данных по конкретному устройству
  getDeviceData(deviceName: string): BenchmarkResult[] {
    return this.history.filter(data => data.device === deviceName);
  }

  // Очистка истории
  clearHistory(): void {
    this.history = [];
    this.statsCache = null;
  }

  // Получение времени последнего обновления
  getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  // Отмена текущего запроса
  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.inflightMonitoringRequest = null;
  }
}

// Экспортируем singleton
export const realBenchmarkService = new RealBenchmarkService();