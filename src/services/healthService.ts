import { fetchChatApi, getChatApiBase, getToken } from './apiClient';
import type { ApiHealthState, ModelReadinessState } from '../types';

const HEALTH_TIMEOUT_MS = 5_000;

export interface ApiHealthResult {
  api: Exclude<ApiHealthState, 'checking'>;
  uptime?: number;
  error?: string;
}

export interface ReadyResult {
  ready: boolean;
  activeModel: string | null;
  llamaServerHealthy: boolean;
  maintenance?: boolean;
  error?: string;
}

type LivenessBody = { status?: string; uptime?: number; code?: string };

async function fetchLiveness(url: string): Promise<{ response: Response; body: LivenessBody | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let body: LivenessBody | null = null;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object') body = parsed as LivenessBody;
    } catch {
      body = null;
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Liveness Node API: `GET /health`, при заглушке — `GET /status` (оба публичные).
 * Прокси studioxlam срезает `/api`, и `/api/health` попадает в `location /health` nginx lm,
 * который отвечает текстовым `OK`, не спрашивая Node. Не-JSON ответ считаем заглушкой.
 */
export async function checkApiHealth(): Promise<ApiHealthResult> {
  const base = getChatApiBase().replace(/\/$/, '');
  try {
    for (const path of ['/health', '/status']) {
      const { response, body } = await fetchLiveness(`${base}${path}`);
      if (response.status === 503 && body?.code === 'MAINTENANCE') return { api: 'maintenance' };
      if (!response.ok) return { api: 'offline', error: `${path}: HTTP ${response.status}` };
      if (body) return { api: 'online', uptime: typeof body.uptime === 'number' ? body.uptime : undefined };
    }
    return { api: 'offline', error: 'Бэкенд не вернул JSON ни на /health, ни на /status' };
  } catch (error) {
    return { api: 'offline', error: error instanceof Error ? error.message : String(error) };
  }
}

/** `GET /api/ready` (auth) — главный индикатор готовности чата. */
export async function checkModelReady(): Promise<ReadyResult> {
  try {
    const response = await fetchChatApi('/ready', { method: 'GET', cache: 'no-store' }, HEALTH_TIMEOUT_MS);
    const data = (await response.json().catch(() => ({}))) as {
      ready?: boolean;
      modelLoaded?: boolean;
      activeModel?: string | null;
      llamaServerHealthy?: boolean;
      code?: string;
      error?: string;
    };
    if (response.status === 503 && data.code === 'MAINTENANCE') {
      return { ready: false, activeModel: null, llamaServerHealthy: false, maintenance: true };
    }
    if (!response.ok) {
      return { ready: false, activeModel: null, llamaServerHealthy: false, error: data.error || `HTTP ${response.status}` };
    }
    return {
      ready: Boolean(data.ready ?? data.modelLoaded),
      activeModel: data.activeModel ?? null,
      llamaServerHealthy: Boolean(data.llamaServerHealthy),
    };
  } catch (error) {
    return {
      ready: false,
      activeModel: null,
      llamaServerHealthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Сняты ли техработы. Сырой fetch без глобальных обработчиков: на экране техработ
 * 401 не должен разлогинивать, а 503 — заново поднимать тот же экран.
 */
export async function probeMaintenance(): Promise<'maintenance' | 'clear' | 'unreachable'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const token = getToken();
    const base = getChatApiBase().replace(/\/$/, '');
    const response = await fetch(`${base}/ready`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 503) {
      const data = (await response.json().catch(() => ({}))) as { code?: string };
      return data.code === 'MAINTENANCE' ? 'maintenance' : 'unreachable';
    }
    if (response.status >= 500) return 'unreachable';
    return 'clear';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/** State machine из FRONTEND_SERVER_MODEL_CONTROL §2.2. */
export function deriveModelState(ready: ReadyResult, operationPending: boolean): ModelReadinessState {
  if (operationPending) return 'loading';
  if (ready.error) return 'error';
  if (ready.ready) return 'ready';
  if (ready.activeModel) return 'degraded';
  return 'unloaded';
}
