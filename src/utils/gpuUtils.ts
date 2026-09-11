import type { GpuStat } from '../types';

export type GpuStatsBundle = Record<string, Partial<GpuStat>>;

export interface GpuEntry {
  key: string;
  index: number;
  stat: Partial<GpuStat>;
}

const GPU_KEY_PATTERN = /^gpu(\d+)$/;

export function isGpuKey(key: string): boolean {
  return GPU_KEY_PATTERN.test(key);
}

export function listGpus(
  bundle?: GpuStatsBundle | Record<string, Partial<GpuStat> | undefined> | null
): GpuEntry[] {
  if (!bundle) return [];

  return Object.entries(bundle)
    .filter((entry): entry is [string, Partial<GpuStat>] => {
      const [key, stat] = entry;
      return isGpuKey(key) && stat != null && typeof stat === 'object';
    })
    .map(([key, stat]) => ({
      key,
      index: Number.parseInt(key.replace('gpu', ''), 10),
      stat,
    }))
    .sort((a, b) => a.index - b.index);
}

export function normalizeGpuBundle(
  bundle?: Record<string, unknown> | null
): GpuStatsBundle {
  if (!bundle || typeof bundle !== 'object') return {};

  const result: GpuStatsBundle = {};
  for (const [key, value] of Object.entries(bundle)) {
    if (isGpuKey(key) && value && typeof value === 'object') {
      result[key] = value as Partial<GpuStat>;
    }
  }
  return result;
}

export function gpuShortLabel(key: string, stat?: Partial<GpuStat>): string {
  const index = Number.parseInt(key.replace('gpu', ''), 10);
  const name = stat?.name?.replace(/^NVIDIA GeForce\s+/i, '') || `GPU ${index}`;
  return `GPU ${index}: ${name}`;
}

export interface AggregatedGpuMetrics {
  gpus: GpuEntry[];
  maxUtilization: number;
  maxTemperature: number;
  totalUsedMb: number;
  totalVramMb: number;
}

export function aggregateGpuMetrics(
  bundle?: GpuStatsBundle | Record<string, Partial<GpuStat> | undefined> | null
): AggregatedGpuMetrics {
  const gpus = listGpus(bundle);

  return {
    gpus,
    maxUtilization: gpus.reduce((max, gpu) => Math.max(max, gpu.stat.utilization ?? 0), 0),
    maxTemperature: gpus.reduce((max, gpu) => Math.max(max, gpu.stat.temperature ?? 0), 0),
    totalUsedMb: gpus.reduce((sum, gpu) => sum + (gpu.stat.used_mb ?? (gpu.stat.used ?? 0) * 1024), 0),
    totalVramMb: gpus.reduce((sum, gpu) => sum + (gpu.stat.total_mb ?? (gpu.stat.total ?? 0) * 1024), 0),
  };
}

export interface GpuHardwareSnapshot {
  key: string;
  index: number;
  name?: string;
  utilization: number;
  temperature: number;
  used_mb: number;
  total_mb: number;
  percentage: number;
}

export function toGpuHardwareSnapshots(bundle?: GpuStatsBundle | null): GpuHardwareSnapshot[] {
  return listGpus(bundle).map(({ key, index, stat }) => ({
    key,
    index,
    name: stat.name,
    utilization: stat.utilization ?? 0,
    temperature: stat.temperature ?? 0,
    used_mb: stat.used_mb ?? Math.round((stat.used ?? 0) * 1024),
    total_mb: stat.total_mb ?? Math.round((stat.total ?? 0) * 1024),
    percentage: stat.percentage ?? 0,
  }));
}

export const GPU_DOT_COLORS = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'] as const;

export function gpuDotColor(index: number): string {
  return GPU_DOT_COLORS[index % GPU_DOT_COLORS.length] ?? 'bg-gray-500';
}
