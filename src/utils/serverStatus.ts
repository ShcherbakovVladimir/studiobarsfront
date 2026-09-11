import type { ServerStatus } from '../types';

const ONLINE_STATUS_VALUES = new Set(['online', 'ok', 'healthy', 'running']);

export function normalizeServerStatusValue(
  status: string | undefined | null
): ServerStatus['status'] {
  if (!status) return 'error';
  const value = status.toLowerCase();
  if (ONLINE_STATUS_VALUES.has(value)) return 'online';
  if (value === 'checking') return 'checking';
  if (value === 'degraded') return 'degraded';
  if (value === 'offline') return 'offline';
  if (value === 'error') return 'error';
  return 'error';
}

export function isServerOnline(status: ServerStatus | string | undefined | null): boolean {
  if (!status) return false;
  if (typeof status === 'string') {
    return normalizeServerStatusValue(status) === 'online';
  }
  return normalizeServerStatusValue(status.status) === 'online';
}
