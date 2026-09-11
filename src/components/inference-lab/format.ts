import type { InferenceResponseStatus } from '../../types';

export function formatMs(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value < 1000) return `${Math.round(value)} мс`;
  return `${(value / 1000).toFixed(2)} с`;
}

export function formatRate(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  const pct = value <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

export function statusLabel(status?: InferenceResponseStatus | string): string {
  switch (status) {
    case 'pending':
      return 'ожидание';
    case 'streaming':
      return 'стрим';
    case 'completed':
      return 'готово';
    case 'error':
      return 'ошибка';
    case 'cancelled':
      return 'отмена';
    default:
      return status ?? '—';
  }
}

export function statusVariant(
  status?: InferenceResponseStatus | string
): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'error') return 'error';
  if (status === 'cancelled') return 'warning';
  if (status === 'streaming' || status === 'pending') return 'info';
  return 'neutral';
}
