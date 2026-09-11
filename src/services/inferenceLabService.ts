import type {
  InferenceLabAccess,
  InferenceLabAnalytics,
  InferenceLabAnalyticsSummary,
  InferenceLabMode,
  InferenceLabPage,
  InferenceRequestRecord,
  InferenceResponseRecord,
  InferenceResponseStatus,
  InferenceLabUsage,
  UnknownRecord,
} from '../types';
import { api, fetchChatApi, ApiError } from './apiClient';
import { consumeInferenceLabStream, type InferenceLabStreamHandlers } from '../utils/inferenceLabStream';
import { buildGrammarApiFields } from '../utils/grammarUtils';

const STREAM_TIMEOUT_MS = 600_000;

export interface InferenceLabRunBody {
  mode: InferenceLabMode;
  stream: boolean;
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stop?: string[];
  grammar?: string;
  json_schema?: UnknownRecord | null;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asMode(value: unknown): InferenceLabMode {
  return value === 'chat' ? 'chat' : 'completion';
}

function asStatus(value: unknown): InferenceResponseStatus {
  if (
    value === 'pending' ||
    value === 'streaming' ||
    value === 'completed' ||
    value === 'error' ||
    value === 'cancelled'
  ) {
    return value;
  }
  return 'completed';
}

function pick<T>(record: UnknownRecord | undefined, keys: string[]): T | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key] as T;
  }
  return undefined;
}

export function normalizeUsage(raw: unknown): InferenceLabUsage | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const promptTokens =
    asNumber(record.promptTokens) ?? asNumber(record.prompt_tokens);
  const completionTokens =
    asNumber(record.completionTokens) ?? asNumber(record.completion_tokens);
  const totalTokens =
    asNumber(record.totalTokens) ?? asNumber(record.total_tokens);
  if (promptTokens == null && completionTokens == null && totalTokens == null) return undefined;
  return { promptTokens, completionTokens, totalTokens };
}

export function normalizeResponse(raw: unknown): InferenceResponseRecord | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const id = pick<string>(record, ['id', 'responseId', 'response_id']);
  const requestId = pick<string>(record, ['requestId', 'request_id']) ?? '';
  if (!id) return undefined;
  return {
    id,
    requestId,
    status: asStatus(pick(record, ['status'])),
    text: asString(pick(record, ['text', 'content', 'output'])),
    error: asString(pick(record, ['error', 'errorMessage', 'error_message'])),
    latencyMs: asNumber(pick(record, ['latencyMs', 'latency_ms'])),
    ttftMs: asNumber(pick(record, ['ttftMs', 'ttft_ms'])),
    chunkCount: asNumber(pick(record, ['chunkCount', 'chunk_count'])),
    usage: normalizeUsage(record.usage),
    createdAt: asString(pick(record, ['createdAt', 'created_at'])),
    updatedAt: asString(pick(record, ['updatedAt', 'updated_at'])),
  };
}

export function normalizeRequest(raw: unknown): InferenceRequestRecord | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const id = pick<string>(record, ['id', 'requestId', 'request_id']);
  if (!id) return undefined;
  const nestedResponse = normalizeResponse(record.response) ?? normalizeResponse(record.latestResponse);
  const preview =
    asString(pick(record, ['preview', 'responsePreview', 'response_preview'])) ??
    nestedResponse?.text?.slice(0, 240);
  const stopRaw = pick<unknown>(record, ['stop']);
  const stop = Array.isArray(stopRaw)
    ? stopRaw.filter((item): item is string => typeof item === 'string')
    : undefined;
  return {
    id,
    userId: asString(pick(record, ['userId', 'user_id'])),
    userEmail: asString(pick(record, ['userEmail', 'user_email', 'email'])),
    mode: asMode(pick(record, ['mode'])),
    stream: asBoolean(pick(record, ['stream'])) ?? false,
    prompt: asString(pick(record, ['prompt'])) ?? '',
    systemPrompt: asString(pick(record, ['systemPrompt', 'system_prompt'])),
    model: asString(pick(record, ['model', 'modelName', 'model_name'])),
    temperature: asNumber(pick(record, ['temperature'])),
    maxTokens: asNumber(pick(record, ['maxTokens', 'max_tokens'])),
    topP: asNumber(pick(record, ['topP', 'top_p'])),
    topK: asNumber(pick(record, ['topK', 'top_k'])),
    stop,
    grammar: asString(pick(record, ['grammar'])),
    jsonSchema: asRecord(pick(record, ['json_schema', 'jsonSchema'])),
    createdAt: asString(pick(record, ['createdAt', 'created_at'])),
    preview,
    response: nestedResponse,
  };
}

function normalizePage<T>(
  data: UnknownRecord,
  itemKeys: string[],
  mapItem: (raw: unknown) => T | undefined
): InferenceLabPage<T> {
  let list: unknown[] = [];
  for (const key of itemKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      list = value;
      break;
    }
  }
  if (list.length === 0) {
    const nested = asRecord(data.data);
    if (nested) {
      for (const key of itemKeys) {
        const value = nested[key];
        if (Array.isArray(value)) {
          list = value;
          break;
        }
      }
    }
  }
  return {
    items: list.map(mapItem).filter((item): item is T => Boolean(item)),
    page: asNumber(data.page) ?? 1,
    limit: asNumber(data.limit) ?? 50,
    total: asNumber(data.total) ?? asNumber(data.count) ?? list.length,
  };
}

function emptySummary(): InferenceLabAnalyticsSummary {
  return {
    requests: 0,
    completed: 0,
    errors: 0,
    cancelled: 0,
    streamed: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    avgTtftMs: 0,
  };
}

export function normalizeAnalytics(raw: unknown): InferenceLabAnalytics {
  const root = asRecord(raw) ?? {};
  const analytics = asRecord(root.analytics) ?? root;
  const summaryRaw = asRecord(analytics.summary) ?? {};
  const summary: InferenceLabAnalyticsSummary = {
    ...emptySummary(),
    requests: asNumber(summaryRaw.requests) ?? 0,
    completed: asNumber(summaryRaw.completed) ?? 0,
    errors: asNumber(summaryRaw.errors) ?? 0,
    cancelled: asNumber(summaryRaw.cancelled) ?? 0,
    streamed: asNumber(summaryRaw.streamed) ?? 0,
    successRate: asNumber(summaryRaw.successRate) ?? asNumber(summaryRaw.success_rate) ?? 0,
    errorRate: asNumber(summaryRaw.errorRate) ?? asNumber(summaryRaw.error_rate) ?? 0,
    avgLatencyMs: asNumber(summaryRaw.avgLatencyMs) ?? asNumber(summaryRaw.avg_latency_ms) ?? 0,
    p50LatencyMs: asNumber(summaryRaw.p50LatencyMs) ?? asNumber(summaryRaw.p50_latency_ms) ?? 0,
    p95LatencyMs: asNumber(summaryRaw.p95LatencyMs) ?? asNumber(summaryRaw.p95_latency_ms) ?? 0,
    avgTtftMs: asNumber(summaryRaw.avgTtftMs) ?? asNumber(summaryRaw.avg_ttft_ms) ?? 0,
    promptTokens: asNumber(summaryRaw.promptTokens) ?? asNumber(summaryRaw.prompt_tokens),
    completionTokens: asNumber(summaryRaw.completionTokens) ?? asNumber(summaryRaw.completion_tokens),
    totalTokens: asNumber(summaryRaw.totalTokens) ?? asNumber(summaryRaw.total_tokens),
  };

  const byDayRaw = Array.isArray(analytics.byDay) ? analytics.byDay : [];
  const byModelRaw = Array.isArray(analytics.byModel) ? analytics.byModel : [];
  const byModeRaw = Array.isArray(analytics.byMode) ? analytics.byMode : [];
  const byUserRaw = Array.isArray(analytics.byUser) ? analytics.byUser : undefined;

  return {
    summary,
    byDay: byDayRaw.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        date: asString(row.date) ?? asString(row.day) ?? '',
        requests: asNumber(row.requests) ?? 0,
        completed: asNumber(row.completed),
        errors: asNumber(row.errors),
      };
    }),
    byModel: byModelRaw.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        model: asString(row.model) ?? 'unknown',
        requests: asNumber(row.requests) ?? 0,
        avgLatencyMs: asNumber(row.avgLatencyMs) ?? asNumber(row.avg_latency_ms),
      };
    }),
    byMode: byModeRaw.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        mode: asString(row.mode) ?? 'completion',
        stream: asBoolean(row.stream),
        requests: asNumber(row.requests) ?? 0,
      };
    }),
    byUser: byUserRaw?.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        userId: asString(row.userId) ?? asString(row.user_id) ?? '',
        email: asString(row.email) ?? asString(row.userEmail),
        requests: asNumber(row.requests) ?? 0,
      };
    }),
  };
}

export function normalizeAccess(raw: unknown): InferenceLabAccess {
  const record = asRecord(raw) ?? {};
  const allowed = asBoolean(record.allowed) ?? asBoolean(record.ok) ?? asBoolean(record.success);
  const enabled = asBoolean(record.enabled) ?? asBoolean(asRecord(record.features)?.inferenceLabEnabled);
  const adminOnly =
    asBoolean(record.adminOnly) ??
    asBoolean(record.admin_only) ??
    asBoolean(asRecord(record.features)?.inferenceLabAdminOnly);
  const userBlocked =
    asBoolean(record.userBlocked) ??
    asBoolean(record.user_blocked) ??
    asBoolean(record.blocked) ??
    false;
  return {
    allowed: allowed ?? (!userBlocked && enabled !== false),
    reason: asString(record.reason) ?? asString(record.error) ?? asString(record.message),
    enabled: enabled ?? true,
    adminOnly: adminOnly ?? false,
    userBlocked,
  };
}

function queryString(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === null) continue;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export interface InferenceLabListParams {
  page?: number;
  limit?: number;
  status?: string;
  mode?: string;
  from?: string;
  to?: string;
  search?: string;
  userId?: string;
}

export const inferenceLabService = {
  getAccess: async (): Promise<InferenceLabAccess> => {
    try {
      const data = await api<UnknownRecord>('/inference-lab/access');
      return normalizeAccess(data);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        return normalizeAccess({
          allowed: false,
          ...(asRecord(error.data) ?? {}),
          reason: error.message,
        });
      }
      throw error;
    }
  },

  listRequests: async (params: InferenceLabListParams = {}, admin = false): Promise<InferenceLabPage<InferenceRequestRecord>> => {
    const path = admin
      ? `/inference-lab/admin/requests${queryString(params)}`
      : `/inference-lab/requests${queryString(params)}`;
    const data = await api<UnknownRecord>(path);
    return normalizePage(data, ['requests', 'items', 'data'], normalizeRequest);
  },

  listResponses: async (params: InferenceLabListParams = {}, admin = false): Promise<InferenceLabPage<InferenceResponseRecord>> => {
    const path = admin
      ? `/inference-lab/admin/responses${queryString(params)}`
      : `/inference-lab/responses${queryString(params)}`;
    const data = await api<UnknownRecord>(path);
    return normalizePage(data, ['responses', 'items', 'data'], normalizeResponse);
  },

  getRequest: async (id: string): Promise<{ request: InferenceRequestRecord; response?: InferenceResponseRecord }> => {
    const data = await api<UnknownRecord>(`/inference-lab/requests/${encodeURIComponent(id)}`);
    const request = normalizeRequest(data.request) ?? normalizeRequest(data);
    if (!request) throw new Error('Прогон не найден');
    const response = normalizeResponse(data.response) ?? request.response;
    return { request: { ...request, response }, response };
  },

  deleteRequest: (id: string) =>
    api<{ success: boolean }>(`/inference-lab/requests/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getAnalytics: async (params: { days?: number; userId?: string } = {}, admin = false): Promise<InferenceLabAnalytics> => {
    const path = admin
      ? `/inference-lab/admin/analytics${queryString(params)}`
      : `/inference-lab/analytics${queryString(params)}`;
    const data = await api<UnknownRecord>(path);
    return normalizeAnalytics(data);
  },

  run: async (
    body: InferenceLabRunBody,
    options: {
      signal?: AbortSignal;
      streamHandlers?: InferenceLabStreamHandlers;
    } = {}
  ): Promise<{ request?: InferenceRequestRecord; response?: InferenceResponseRecord; text: string }> => {
    const grammarFields = buildGrammarApiFields({
      grammar: body.grammar,
      jsonSchema: body.json_schema ?? undefined,
    });
    const payload = {
      ...body,
      ...grammarFields,
      json_schema: grammarFields.json_schema ?? body.json_schema ?? null,
    };

    const response = await fetchChatApi(
      '/inference-lab/run',
      {
        method: 'POST',
        headers: { Accept: body.stream ? 'text/event-stream' : 'application/json' },
        body: JSON.stringify(payload),
        signal: options.signal,
      },
      STREAM_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!body.stream || (contentType.includes('application/json') && !contentType.includes('event-stream'))) {
      const data = (await response.json()) as UnknownRecord;
      const request = normalizeRequest(data.request);
      const rec = normalizeResponse(data.response);
      const text = rec?.text ?? asString(asRecord(data.response)?.text) ?? '';
      return { request, response: rec, text };
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    const text = await consumeInferenceLabStream(
      response,
      options.signal ?? new AbortController().signal,
      options.streamHandlers ?? {}
    );
    return { text };
  },
};

export default inferenceLabService;
