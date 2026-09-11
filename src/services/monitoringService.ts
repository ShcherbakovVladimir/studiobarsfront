import { api } from './apiClient';
import type { GpuStatsBundle } from '../types';

export interface MonitoringGpuStat {
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

export interface MonitoringSystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkActive: boolean;
  uptime: string;
  uptimeSeconds: number;
  totalMemory: string;
  usedMemory: string;
  freeMemory: string;
  cpuCores?: number;
  platform?: string;
  arch?: string;
  loadAverage?: number[];
}

export interface MonitoringTrainingSession {
  sessionId: string;
  progress: number;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  logsCount: number;
  gpuStats: GpuStatsBundle;
}

export interface MonitoringFullData {
  success: boolean;
  timestamp: string;
  system: MonitoringSystemStats;
  gpu: GpuStatsBundle;
  training: {
    sessions: MonitoringTrainingSession[];
    total: number;
    active?: number;
  };
  server: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    version: string;
  };
  error?: string;
}

export const monitoringService = {
  getFull: (signal?: AbortSignal) =>
    api<MonitoringFullData>('/monitoring/full', { signal }),
};

export default monitoringService;
