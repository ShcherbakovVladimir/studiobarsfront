// /home/user/projects/studioxlam/src/services/ragService.ts

import { ragApi, getRagApiBase, getToken, fetchRagApi } from './apiClient';
import { getErrorMessage } from '../utils/errorUtils';
import { readSseFrames } from '../utils/sseStream';
import type { RagSession, RagDocument, RagDocumentPreview, UnknownRecord } from '../types';
import { createRagSessionId } from './chatSyncService';

export { createRagSessionId };

export const ragSessionTitlesStorageKey = (userId: string) => `rag_session_titles__u_${userId}`;

export function loadSessionTitles(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(ragSessionTitlesStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSessionTitle(userId: string, sessionId: string, title: string): void {
  const titles = loadSessionTitles(userId);
  titles[sessionId] = title;
  localStorage.setItem(ragSessionTitlesStorageKey(userId), JSON.stringify(titles));
}

export function clearSessionTitle(userId: string, sessionId: string): void {
  const titles = loadSessionTitles(userId);
  delete titles[sessionId];
  localStorage.setItem(ragSessionTitlesStorageKey(userId), JSON.stringify(titles));
}

export function mergeSessionTitles(userId: string | undefined, sessions: RagSession[]): RagSession[] {
  if (!userId) return sessions;
  const titles = loadSessionTitles(userId);
  if (Object.keys(titles).length === 0) return sessions;
  return sessions.map((session) => {
    const customTitle = titles[session.sessionId];
    return customTitle ? { ...session, title: customTitle } : session;
  });
}

export const ragSessionsStorageKey = (userId: string) => `rag_sessions__u_${userId}`;

function asRagSession(item: unknown): RagSession | null {
  if (typeof item === 'string' && item.trim()) {
    return {
      sessionId: item,
      title: 'Новая сессия',
      customTitle: false,
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      count: 0,
    };
  }
  if (!item || typeof item !== 'object' || !('sessionId' in item)) return null;
  const row = item as Partial<RagSession> & { sessionId: string };
  const messageCount = row.messageCount ?? row.count ?? 0;
  return {
    sessionId: String(row.sessionId),
    title: row.title || 'Новая сессия',
    customTitle: Boolean(row.customTitle),
    updatedAt: row.updatedAt || new Date().toISOString(),
    messageCount,
    count: row.count ?? messageCount,
  };
}

export function loadLocalRagSessionStore(userId?: string): {
  sessions: RagSession[];
  lastActiveId: string | null;
} {
  if (!userId) return { sessions: [], lastActiveId: null };
  try {
    const raw = localStorage.getItem(ragSessionsStorageKey(userId));
    if (!raw) return { sessions: [], lastActiveId: null };
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        sessions: parsed.map(asRagSession).filter((row): row is RagSession => Boolean(row)),
        lastActiveId: null,
      };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as { sessions?: unknown; ids?: unknown; lastActiveId?: unknown };
      const source = Array.isArray(record.sessions) ? record.sessions : record.ids;
      return {
        sessions: Array.isArray(source)
          ? source.map(asRagSession).filter((row): row is RagSession => Boolean(row))
          : [],
        lastActiveId: typeof record.lastActiveId === 'string' ? record.lastActiveId : null,
      };
    }
  } catch {
    /* ignore corrupt cache */
  }
  return { sessions: [], lastActiveId: null };
}

export function saveLocalRagSessionStore(
  userId: string | undefined,
  sessions: RagSession[],
  lastActiveId?: string | null
): void {
  if (!userId) return;
  const pruned = pruneRagSessionDrafts(sessions, lastActiveId);
  localStorage.setItem(
    ragSessionsStorageKey(userId),
    JSON.stringify({
      sessions: pruned.slice(0, 50),
      lastActiveId: lastActiveId && pruned.some((session) => session.sessionId === lastActiveId)
        ? lastActiveId
        : pruned[0]?.sessionId ?? null,
    })
  );
}

export function mergeServerAndLocalRagSessions(
  server: RagSession[],
  local: RagSession[]
): RagSession[] {
  const byId = new Map<string, RagSession>();
  for (const session of local) {
    if (session.sessionId) byId.set(session.sessionId, session);
  }
  for (const session of server) {
    if (session.sessionId) byId.set(session.sessionId, session);
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '')
  );
}

export function isEmptyUntitledRagDraft(session: RagSession): boolean {
  const count = session.messageCount ?? session.count ?? 0;
  const title = (session.title || '').trim();
  return count === 0 && (!title || title === 'Новая сессия' || title === session.sessionId);
}

/** Keep real chats; at most one empty untitled draft (the active one). */
export function pruneRagSessionDrafts(
  sessions: RagSession[],
  keepDraftId?: string | null
): RagSession[] {
  const kept: RagSession[] = [];
  let keptDraft = false;
  for (const session of sessions) {
    if (!isEmptyUntitledRagDraft(session)) {
      kept.push(session);
      continue;
    }
    if (keepDraftId && session.sessionId === keepDraftId && !keptDraft) {
      kept.push(session);
      keptDraft = true;
    }
  }
  return kept;
}

export function pickActiveRagSessionId(
  sessions: RagSession[],
  preferredIds: Array<string | null | undefined>
): string {
  const ids = new Set(sessions.map((session) => session.sessionId));
  for (const id of preferredIds) {
    if (id && ids.has(id)) return id;
  }
  const named = sessions.find((session) => {
    const title = (session.title || '').trim();
    return Boolean(title && title !== 'Новая сессия' && title !== session.sessionId);
  });
  if (named) return named.sessionId;
  const withMessages = sessions.find((session) => (session.messageCount ?? session.count ?? 0) > 0);
  if (withMessages) return withMessages.sessionId;
  return sessions[0]?.sessionId ?? '';
}

export function ensureRagSessionInList(sessions: RagSession[], sessionId: string): RagSession[] {
  if (!sessionId || sessions.some((session) => session.sessionId === sessionId)) {
    return sessions;
  }
  return [
    {
      sessionId,
      title: 'Новая сессия',
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      count: 0,
    },
    ...sessions,
  ];
}

async function ragFetch(path: string, init: RequestInit = {}, timeoutMs?: number): Promise<Response> {
  return fetchRagApi(path, init, timeoutMs);
}

export interface RAGQueryRequest {
  query: string;
  sessionId?: string;
  saveHistory?: boolean;
  generateChart?: boolean;
  // Qwen3.6 параметры
  enableThinking?: boolean;
  preserveThinking?: boolean;
  qwenMode?: string;
  // Режим поиска
  searchMode?: 'llm' | 'direct';
}

export interface RAGQueryResponse {
  success: boolean;
  text_analysis: string;
  metrics: UnknownRecord;
  chart_data: {
    type: 'line' | 'bar' | 'pie';
    x_axis?: string[];
    y_axis?: number[];
    labels?: string[];
    values?: number[];
    title?: string;
    x_label?: string;
    y_label?: string;
  } | null;
  insights?: string[];
  recommendations?: string[];
  sql: string;
  explanation: string;
  row_count: number;
  execution_time: number;
  session_id: string;
  error?: string;
  // Qwen3.6 дополнительные поля
  qwen_mode?: string;
  think_blocks?: string[];
  cached?: boolean;
  cache_hit?: boolean;
  qwen_info?: {
    enabled: boolean;
    mode: string;
    enable_thinking: boolean;
    preserve_thinking: boolean;
    effective_mode: string;
    think_blocks_count: number;
  };
  // Режим поиска в ответе
  search_mode?: 'llm' | 'direct';
}

export interface RAGHistoryResponse {
  success: boolean;
  sessionId: string;
  history: Array<{
    timestamp: string;
    query: string;
    attached_files?: Array<{ name: string; type?: string; role?: string }>;
    think_blocks?: string[];
    response: {
      text_analysis: string;
      type?: 'chat' | 'document' | 'sql';
      sources?: Array<{ source: string; similarity?: number }>;
      generated_files?: Array<{ id?: string; name?: string; content?: string; type?: string }>;
      sql?: string | null;
      metrics?: UnknownRecord;
      row_count?: number;
      execution_time?: number;
      search_mode?: 'llm' | 'direct';
    };
  }>;
  count: number;
}

export interface RAGMetricsResponse {
  success: boolean;
  status: 'ready' | 'initializing' | 'error';
  database_connected: boolean;
  timestamp: string;
  metrics?: UnknownRecord;
  qwen?: {
    isQwen36: boolean;
    enableThinking: boolean;
    preserveThinking: boolean;
    mode: string;
    availableModes: string[];
  };
}

export interface RAGSchemaResponse {
  success: boolean;
  schema: {
    tables: Array<{
      name: string;
      schema: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
      }>;
      primaryKeys: string[];
      foreignKeys: Array<{
        column: string;
        references: string;
      }>;
    }>;
    relationships: Array<{
      from: string;
      to: string;
      type: string;
    }>;
  };
}

export interface RAGTablesResponse {
  success: boolean;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
    columnCount: number;
    rowCount: number;
  }>;
  count: number;
}

export interface QwenInfoResponse {
  success: boolean;
  isQwen36: boolean;
  enableThinking: boolean;
  preserveThinking: boolean;
  mode: string;
  availableModes: string[];
  model?: string;
  modelName?: string;
  model_name?: string;
  name?: string;
  version?: string;
  config?: {
    modes: Record<string, {
      temperature: number;
      top_p: number;
      top_k: number;
      presence_penalty: number;
      repetition_penalty: number;
      enable_thinking: boolean;
      max_tokens: number;
      default: boolean;
      description: string;
    }>;
    defaults: {
      enable_thinking: boolean;
      preserve_thinking: boolean;
      max_tokens: number;
      timeout_seconds: number;
    };
  };
  timestamp: string;
}

export interface QwenConfigUpdateResponse {
  success: boolean;
  message: string;
  config: QwenInfoResponse;
  timestamp: string;
}

export interface UploadResponse {
  success: boolean;
  tableName: string;
  rowCount: number;
  columns: string[];
  queuedForEmbedding: number;
  message: string;
  execution_time: number;
  embedding_status: string;
  rowsInserted?: number;
  qwen_embedding?: {
    dimension: number;
    model: string;
  };
}

export interface DocumentUploadOptions {
  ifExists?: 'replace' | 'append' | 'skip';
  chunking_mode?: string;
  content_format?: string;
  original_source?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  source?: string;
  chunks?: number;
  embedded_chunks?: number;
  missing_embeddings?: number;
  completion_percentage?: number;
  embedding_status?: string;
  is_fully_indexed?: boolean;
  indexing_in_progress?: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface BatchUploadResponse {
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    file: string;
    success: boolean;
    tableName?: string;
    source?: string;
    rowCount?: number;
    chunks?: number;
    columns?: string[];
    queuedForEmbedding?: number;
    error?: string;
  }>;
  execution_time: number;
}

export interface TableUploadOptions {
  tableName: string;
  ifExists?: 'replace' | 'append' | 'skip';
}

function asPayloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeStreamEvent(raw: RAGStreamEvent & Record<string, unknown>): RAGStreamEvent {
  const thinkBlocks = [
    ...asStringList(raw.thinkBlocks),
    ...asStringList(raw.think_blocks),
  ];
  const uniqueThink = [...new Set(thinkBlocks)];
  const typeRaw = String(raw.type ?? '');
  const type =
    typeRaw === 'chunk' || typeRaw === 'thinking' || typeRaw === 'final' || typeRaw === 'error'
      ? typeRaw
      : (raw.type as RAGStreamEvent['type']);
  return {
    ...raw,
    type,
    thinkBlocks: uniqueThink.length ? uniqueThink : raw.thinkBlocks,
    think_blocks: uniqueThink.length ? uniqueThink : raw.think_blocks,
    content:
      typeof raw.content === 'string' && raw.content
        ? raw.content
        : type === 'thinking' && uniqueThink.length
          ? uniqueThink.join('\n')
          : raw.content,
  };
}

function parseQwenInfoPayload(data: unknown): QwenInfoResponse {
  const row = asPayloadRecord(data);
  const nested = asPayloadRecord(row.config);
  const modesRaw = row.availableModes ?? row.available_modes ?? nested.availableModes;
  const availableModes = Array.isArray(modesRaw)
    ? modesRaw.map((item) => String(item).toLowerCase()).filter(Boolean)
    : ['auto', 'thinking', 'instruct', 'coding'];
  const mode = String(row.mode ?? row.qwenMode ?? row.qwen_mode ?? 'auto');
  return {
    success: row.success !== false,
    isQwen36: Boolean(row.isQwen36 ?? row.is_qwen36),
    enableThinking: Boolean(row.enableThinking ?? row.enable_thinking ?? true),
    preserveThinking: Boolean(row.preserveThinking ?? row.preserve_thinking),
    mode,
    availableModes: availableModes.length ? availableModes : ['auto', 'thinking', 'instruct', 'coding'],
    model: typeof row.model === 'string' ? row.model : undefined,
    modelName: typeof row.modelName === 'string' ? row.modelName : typeof row.model_name === 'string' ? row.model_name : undefined,
    model_name: typeof row.model_name === 'string' ? row.model_name : undefined,
    name: typeof row.name === 'string' ? row.name : undefined,
    version: typeof row.version === 'string' ? row.version : undefined,
    config: row.config as QwenInfoResponse['config'],
    timestamp: typeof row.timestamp === 'string' ? row.timestamp : new Date().toISOString(),
  };
}

function parseDocumentsPayload(data: unknown): RagDocument[] {
  const row = asPayloadRecord(data);
  const nested = asPayloadRecord(row.data);
  const candidates = [
    row.documents,
    row.sources,
    row.files,
    row.items,
    nested.documents,
    nested.sources,
    nested.files,
    nested.items,
  ];
  const raw = candidates.find((item) => Array.isArray(item)) as unknown[] | undefined;
  if (!raw) return [];
  const seen = new Set<string>();
  return raw.map((item) => {
    const doc = asPayloadRecord(item);
    const meta = asPayloadRecord(doc.metadata);
    const sourceValue =
      doc.source ?? doc.source_name ?? doc.ragSource ?? doc.rag_source ??
      meta.source ?? doc.name ?? doc.filename ?? doc.id;
    const source = typeof sourceValue === 'string' ? sourceValue : String(sourceValue ?? '');
    const chunks = doc.chunks ?? doc.chunk_count ?? doc.total_chunks;
    const embedded = doc.embedded_chunks ?? doc.embeddedChunks;
    const completion = doc.completion_percentage ?? doc.completionPercentage;
    const fully = doc.is_fully_indexed ?? doc.isFullyIndexed;
    const indexing = doc.indexing_in_progress ?? doc.indexingInProgress;
    return {
      ...(item as RagDocument),
      source,
      chunks: typeof chunks === 'number' ? chunks : Number(chunks) || (item as RagDocument).chunks,
      embedded_chunks: typeof embedded === 'number' ? embedded : Number(embedded) || (item as RagDocument).embedded_chunks,
      completion_percentage:
        typeof completion === 'number' ? completion : Number(completion) || (item as RagDocument).completion_percentage,
      is_fully_indexed:
        typeof fully === 'boolean'
          ? fully
          : fully === 'true' || fully === 1
            ? true
            : fully === 'false' || fully === 0
              ? false
              : (item as RagDocument).is_fully_indexed,
      indexing_in_progress:
        typeof indexing === 'boolean'
          ? indexing
          : indexing === 'true' || indexing === 1
            ? true
            : (item as RagDocument).indexing_in_progress,
      embedding_status: typeof doc.embedding_status === 'string'
        ? doc.embedding_status
        : typeof doc.embeddingStatus === 'string'
          ? doc.embeddingStatus
          : (item as RagDocument).embedding_status,
    };
  }).filter((doc) => {
    if (!doc.source || seen.has(doc.source)) return false;
    seen.add(doc.source);
    return true;
  });
}

async function downloadRagBlob(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(buildRagUrl(path), { headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Download failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function buildRagUrl(path: string): string {
  const ragPath = path.startsWith('/api/rag') ? path : `/api/rag${path.startsWith('/') ? path : `/${path}`}`;
  const base = getRagApiBase();
  return base.endsWith('/api') && ragPath.startsWith('/api/')
    ? `${base}${ragPath.slice(4)}`
    : `${base}${ragPath}`;
}

function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText) as T & { error?: string; success?: boolean };
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error ?? `Upload failed: HTTP ${xhr.status}`));
        }
      } catch {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

    const token = getToken();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export interface TestResponse {
  success: boolean;
  status: string;
  version: string;
  mode: string;
  database: {
    connected: boolean;
    tables_count: number;
    relationships_count: number;
  };
  vector_search: boolean;
  qwen: QwenInfoResponse;
  features: {
    self_critique: boolean;
    two_stage_generation: boolean;
    dialogue_context: boolean;
    qwen_thinking_mode: boolean;
    qwen_preserve_thinking: boolean;
  };
}

export interface RAGStreamEvent {
  type: 'chunk' | 'thinking' | 'final' | 'error';
  content?: string;
  thinkBlocks?: unknown[];
  response?: string;
  text_analysis?: string;
  sources?: Array<{ source: string; similarity?: number }>;
  generated_files?: Array<{ id?: string; name?: string; content?: string; type?: string }>;
  error?: string;
  metrics?: UnknownRecord;
  chart_data?: RAGQueryResponse['chart_data'];
  insights?: string[];
  recommendations?: string[];
  sql?: string;
  explanation?: string;
  row_count?: number;
  execution_time?: number;
  search_mode?: 'llm' | 'direct';
  think_blocks?: string[];
  qwen_mode?: string;
}

export interface RAGStreamRequest {
  query: string;
  sessionId: string;
  enableThinking?: boolean;
  preserveThinking?: boolean;
  qwenMode?: string;
  limit?: number;
  relevanceScore?: number;
  history?: Array<{ role: string; content: string }>;
  intent?: 'chat' | 'document' | 'sql';
  documentSources?: string[];
  tableNames?: string[];
  compareDocuments?: string[];
}

async function parseRagErrorResponse(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  if (response.status === 413) {
    return 'Файл превышает допустимый размер (лимит сервера)';
  }
  if (response.status === 503) {
    return 'RAG-сервис временно недоступен. Повторите попытку позже.';
  }
  if (response.status === 404) {
    return 'Ресурс не найден у текущего пользователя';
  }
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    if (text.trim()) return text.slice(0, 500);
  }
  return fallback;
}

function buildStreamRequestBody(request: RAGStreamRequest): Record<string, unknown> {
  const compareDocs =
    request.compareDocuments && request.compareDocuments.length >= 2
      ? request.compareDocuments
      : [];
  const documentSources = compareDocs.length >= 2 ? [] : (request.documentSources ?? []);
  const tableNames = request.tableNames ?? [];

  const body: Record<string, unknown> = {
    query: request.query,
    sessionId: request.sessionId,
    enableThinking: request.enableThinking,
    preserveThinking: request.preserveThinking,
    qwenMode: request.qwenMode || 'auto',
    limit: request.limit,
    relevanceScore: request.relevanceScore,
    threshold: request.relevanceScore,
    history: request.history,
    intent: request.intent,
    file_context: {
      documents: compareDocs.length >= 2 ? compareDocs : documentSources,
      tables: tableNames,
      compare: { documents: compareDocs },
    },
  };

  if (compareDocs.length >= 2) {
    body.compareDocuments = compareDocs;
  }
  if (documentSources.length > 0) {
    body.documentSources = documentSources;
  }
  if (tableNames.length > 0) {
    body.tableNames = tableNames;
  }

  return body;
}

export const ragService = {
  async listSessions(): Promise<RagSession[]> {
    try {
      const data = await ragApi<{ success: boolean; sessions: RagSession[] }>('/sessions');
      return (data.sessions ?? []).map((row) => asRagSession(row)).filter((row): row is RagSession => Boolean(row));
    } catch {
      /* error → GET /history */
    }
    try {
      const fallback = await ragFetch('/history');
      if (!fallback.ok) return [];
      const data = await fallback.json() as { sessions?: RagSession[]; sessionIds?: string[] };
      if (data.sessions?.length) {
        return data.sessions.map((row) => asRagSession(row)).filter((row): row is RagSession => Boolean(row));
      }
      return (data.sessionIds ?? []).map((sessionId) => ({
        sessionId,
        title: sessionId,
        customTitle: false,
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        count: 0,
      }));
    } catch {
      return [];
    }
  },

  async createSession(title = 'Новая сессия'): Promise<RagSession> {
    const data = await ragApi<{ success?: boolean; session?: RagSession } & Partial<RagSession>>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    const session = asRagSession(data.session ?? data);
    if (!session) {
      throw new Error('Сервер не вернул sessionId');
    }
    return { ...session, customTitle: session.customTitle ?? true };
  },

  async getSession(sessionId: string): Promise<RagSession | null> {
    try {
      const data = await ragApi<{ success?: boolean; session?: RagSession } & Partial<RagSession>>(
        `/sessions/${encodeURIComponent(sessionId)}`
      );
      return asRagSession(data.session ?? data);
    } catch {
      return null;
    }
  },

  async updateSessionTitle(sessionId: string, title: string): Promise<RagSession | null> {
    const data = await ragApi<{ success?: boolean; session?: RagSession } & Partial<RagSession>>(
      `/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
    return asRagSession(data.session ?? { sessionId, title, customTitle: title.trim().length > 0 });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await ragApi(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  },

  async queryStream(
    request: RAGStreamRequest,
    handlers: {
      onEvent: (event: RAGStreamEvent) => void;
      onError?: (error: Error) => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    const response = await ragFetch('/query/stream', {
      method: 'POST',
      body: JSON.stringify(buildStreamRequestBody(request)),
      signal: handlers.signal,
    }, 200_000);
    if (!response.ok || !response.body) {
      throw new Error(
        await parseRagErrorResponse(response, `RAG stream failed: HTTP ${response.status}`)
      );
    }

    // RAG frames carry `type`, never `choices[0].delta` — the chat reader would
    // silently drop all of them. There is usually no `[DONE]` here either.
    await readSseFrames(
      response,
      (payload) => {
        if (payload === '[DONE]') return 'stop';

        let event: RAGStreamEvent;
        try {
        event = normalizeStreamEvent(JSON.parse(payload) as RAGStreamEvent & Record<string, unknown>);
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        switch (event.type) {
          case 'chunk':
          case 'thinking':
          case 'final':
          case 'error':
            handlers.onEvent(event);
            return;
          default:
            return;
        }
      },
      handlers.signal
    );
  },

  async getDocuments(): Promise<{ success: boolean; documents: RagDocument[] }> {
    const response = await ragFetch('/documents');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = data as { error?: string };
      throw new Error(err.error ?? `Не удалось получить документы: HTTP ${response.status}`);
    }
    const documents = parseDocumentsPayload(data);
    return { success: true, documents };
  },

  async getDocument(sourceName: string): Promise<{ success: boolean; document?: RagDocument; chunks?: UnknownRecord[] }> {
    const response = await ragFetch(`/documents/${encodeURIComponent(sourceName)}`);
    if (!response.ok) return { success: false };
    return response.json() as Promise<{ success: boolean; document?: RagDocument; chunks?: UnknownRecord[] }>;
  },

  async deleteDocument(sourceName: string): Promise<{ success: boolean; message?: string }> {
    const response = await ragFetch(`/documents/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Delete failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<{ success: boolean; message?: string }>;
  },

  async reindexDocument(
    sourceName: string,
    force = false
  ): Promise<{ success: boolean; message?: string }> {
    const response = await ragFetch(`/documents/${encodeURIComponent(sourceName)}/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Reindex failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<{ success: boolean; message?: string }>;
  },

  async downloadDocument(sourceName: string, filename?: string): Promise<void> {
    await downloadRagBlob(
      `/documents/${encodeURIComponent(sourceName)}/download`,
      filename ?? sourceName
    );
  },

  async previewDocument(
    file: File,
    options: DocumentUploadOptions = {}
  ): Promise<RagDocumentPreview> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.ifExists) formData.append('ifExists', options.ifExists);
    if (options.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options.content_format) formData.append('content_format', options.content_format);
    if (options.original_source) formData.append('original_source', options.original_source);

    const response = await ragFetch('/upload/document/preview', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Preview failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<RagDocumentPreview>;
  },

  async uploadDocument(
    file: File,
    options: DocumentUploadOptions = {}
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.ifExists) formData.append('ifExists', options.ifExists);
    if (options.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options.content_format) formData.append('content_format', options.content_format);
    if (options.original_source) formData.append('original_source', options.original_source);

    const response = await ragFetch('/upload/document', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Upload failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<DocumentUploadResponse>;
  },

  uploadDocumentWithProgress(
    file: File,
    options: DocumentUploadOptions = {},
    onProgress?: (percent: number) => void
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.ifExists) formData.append('ifExists', options.ifExists);
    if (options.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options.content_format) formData.append('content_format', options.content_format);
    if (options.original_source) formData.append('original_source', options.original_source);

    return uploadWithProgress<DocumentUploadResponse>(
      buildRagUrl('/upload/document'),
      formData,
      onProgress
    );
  },

  uploadTableWithProgress(
    file: File,
    options: TableUploadOptions,
    onProgress?: (percent: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', options.tableName);
    formData.append('ifExists', options.ifExists ?? 'replace');

    return uploadWithProgress<UploadResponse>(buildRagUrl('/upload'), formData, onProgress);
  },

  uploadBatchWithProgress(
    files: File[],
    options: {
      tableNamePrefix?: string;
      ifExists?: 'replace' | 'append' | 'skip';
      chunking_mode?: string;
      content_format?: string;
    } = {},
    onProgress?: (percent: number) => void
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (options.tableNamePrefix) formData.append('tableNamePrefix', options.tableNamePrefix);
    if (options.ifExists) formData.append('ifExists', options.ifExists);
    if (options.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options.content_format) formData.append('content_format', options.content_format);

    return uploadWithProgress<BatchUploadResponse>(buildRagUrl('/upload/batch'), formData, onProgress);
  },

  async uploadDocumentsBatch(
    files: File[],
    options: DocumentUploadOptions = {},
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; results: DocumentUploadResponse[]; failed: string[] }> {
    const results: DocumentUploadResponse[] = [];
    const failed: string[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (options.ifExists) formData.append('ifExists', options.ifExists);
        if (options.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
        if (options.content_format) formData.append('content_format', options.content_format);
        formData.append('original_source', options.original_source ?? file.name);

        const result = await uploadWithProgress<DocumentUploadResponse>(
          buildRagUrl('/upload/document'),
          formData,
          (fileProgress) => {
            if (onProgress) {
              onProgress(Math.round(((i + fileProgress / 100) / total) * 100));
            }
          }
        );
        results.push(result);
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : 'error'}`);
      }
    }

    return { success: failed.length === 0, results, failed };
  },

  // Основной запрос к RAG с поддержкой Qwen3.6 и режима поиска
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    try {
      const response = await ragFetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: request.query,
          sessionId: request.sessionId,
          saveHistory: request.saveHistory,
          generateChart: request.generateChart,
          // Qwen3.6 параметры
          enableThinking: request.enableThinking,
          preserveThinking: request.preserveThinking,
          qwenMode: request.qwenMode,
          // Режим поиска
          searchMode: request.searchMode || 'llm'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Трансформируем ответ для единообразия
      return {
        success: data.success,
        text_analysis: data.text_analysis,
        metrics: data.metrics || {},
        chart_data: data.chart_data || null,
        insights: data.insights || [],
        recommendations: data.recommendations || [],
        sql: data.sql || '',
        explanation: data.explanation || '',
        row_count: data.row_count || 0,
        execution_time: data.execution_time || 0,
        session_id: data.session_id || request.sessionId || 'default',
        error: data.error,
        // Qwen3.6 дополнительные поля
        qwen_mode: data.qwen_info?.effective_mode || data.qwen_mode,
        think_blocks: data.think_blocks,
        cached: data.cached,
        cache_hit: data.cache_hit,
        qwen_info: data.qwen_info,
        // Режим поиска
        search_mode: data.search_mode || request.searchMode || 'llm'
      };
    } catch (error) {
      console.error('RAG query error:', error);
      return {
        success: false,
        text_analysis: `Ошибка: ${getErrorMessage(error)}`,
        metrics: {},
        chart_data: null,
        insights: [],
        recommendations: [],
        sql: '',
        explanation: '',
        row_count: 0,
        execution_time: 0,
        session_id: request.sessionId || 'default',
        error: getErrorMessage(error),
        search_mode: request.searchMode || 'llm'
      };
    }
  },

  // Прямой поиск по базе данных (без LLM)
  async directSearch(query: string, limit: number = 100): Promise<{
    success: boolean;
    query: string;
    results: UnknownRecord[];
    sql?: string;
    execution_time: number;
    error?: string;
  }> {
    try {
      const response = await ragFetch('/direct-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Direct search error:', error);
      return {
        success: false,
        query,
        results: [],
        execution_time: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Получить историю запросов
  async getHistory(sessionId: string, limit: number = 20): Promise<RAGHistoryResponse> {
    try {
      const response = await ragFetch(`/history/${sessionId}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get RAG history error:', error);
      return {
        success: false,
        sessionId,
        history: [],
        count: 0
      };
    }
  },

  // Очистить историю
  async clearHistory(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ragFetch(`/history/${sessionId}`, {
        method: 'DELETE'
      });
      
      return await response.json();
    } catch (error) {
      console.error('Clear RAG history error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Получить метрики RAG (включая Qwen3.6 информацию)
  async getMetrics(): Promise<RAGMetricsResponse> {
    try {
      const response = await ragFetch('/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get RAG metrics error:', error);
      return {
        success: false,
        status: 'error',
        database_connected: false,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Получить схему БД
  async getSchema(): Promise<RAGSchemaResponse> {
    try {
      const response = await ragFetch('/schema');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get RAG schema error:', error);
      return {
        success: false,
        schema: { tables: [], relationships: [] }
      };
    }
  },

  // Получить список таблиц
  async getTables(): Promise<RAGTablesResponse> {
    try {
      const response = await ragFetch('/tables');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get tables error:', error);
      return {
        success: false,
        tables: [],
        count: 0
      };
    }
  },

  // Обновить схему БД
  async refreshSchema(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ragFetch('/schema/refresh', {
        method: 'POST'
      });
      
      return await response.json();
    } catch (error) {
      console.error('Refresh RAG schema error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Тест подключения к БД (с Qwen3.6 информацией)
  async testConnection(): Promise<TestResponse> {
    try {
      const response = await ragFetch('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      return await response.json();
    } catch (error) {
      console.error('RAG test error:', error);
      return {
        success: false,
        status: 'error',
        version: 'unknown',
        mode: 'hybrid',
        database: { connected: false, tables_count: 0, relationships_count: 0 },
        vector_search: false,
        qwen: {
          success: false,
          isQwen36: false,
          enableThinking: true,
          preserveThinking: false,
          mode: 'auto',
          availableModes: ['auto', 'thinking', 'instruct', 'coding'],
          timestamp: new Date().toISOString()
        },
        features: {
          self_critique: false,
          two_stage_generation: false,
          dialogue_context: false,
          qwen_thinking_mode: false,
          qwen_preserve_thinking: false
        }
      };
    }
  },

  // ========== QWEN3.6 СПЕЦИФИЧНЫЕ МЕТОДЫ ==========

  // Получить информацию о Qwen3.6
  async getQwenInfo(): Promise<QwenInfoResponse> {
    try {
      const response = await ragFetch('/qwen/info');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return parseQwenInfoPayload(await response.json());
    } catch (error) {
      console.error('Get Qwen info error:', error);
      return {
        success: false,
        isQwen36: false,
        enableThinking: true,
        preserveThinking: false,
        mode: 'auto',
        availableModes: ['auto', 'thinking', 'instruct', 'coding'],
        timestamp: new Date().toISOString()
      };
    }
  },

  // Обновить конфигурацию Qwen3.6
  async updateQwenConfig(config: {
    enableThinking?: boolean;
    preserveThinking?: boolean;
    qwenMode?: string;
  }): Promise<QwenConfigUpdateResponse> {
    try {
      const response = await ragFetch('/qwen/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as QwenConfigUpdateResponse & { config?: unknown };
      return {
        ...data,
        config: parseQwenInfoPayload(data.config ?? data),
      };
    } catch (error) {
      console.error('Update Qwen config error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        config: {
          success: false,
          isQwen36: false,
          enableThinking: true,
          preserveThinking: false,
          mode: 'auto',
          availableModes: [],
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  // Тест Qwen3.6 в разных режимах
  async testQwenModes(query: string, modes: string[] = ['thinking', 'instruct', 'coding']): Promise<{
    success: boolean;
    query: string;
    results: UnknownRecord;
    best_mode: string | null;
    total_time_ms: number;
    timestamp: string;
  }> {
    try {
      const response = await ragFetch('/qwen/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, modes })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Test Qwen modes error:', error);
      return {
        success: false,
        query,
        results: {},
        best_mode: null,
        total_time_ms: 0,
        timestamp: new Date().toISOString()
      };
    }
  },

  // ========== ЗАГРУЗКА ФАЙЛОВ ==========

  /** @deprecated For documents use uploadDocument / uploadDocumentWithProgress */
  async uploadFile(file: File, tableName: string = 'vector_store', ifExists: 'replace' | 'append' = 'replace'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', tableName);
    formData.append('ifExists', ifExists);
    return uploadWithProgress<UploadResponse>(buildRagUrl('/upload'), formData);
  },

  // Массовая загрузка файлов (legacy SQL tables)
  async uploadBatch(files: File[], tableNamePrefix: string = 'upload_'): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('tableNamePrefix', tableNamePrefix);
    return uploadWithProgress<BatchUploadResponse>(buildRagUrl('/upload/batch'), formData);
  },

  // Получить список загруженных файлов
  async getUploadedFiles(): Promise<{ success: boolean; files: Array<{ name: string; rowCount: number }>; count: number }> {
    try {
      const response = await ragFetch('/files');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get uploaded files error:', error);
      return { success: false, files: [], count: 0 };
    }
  },

  // Удалить таблицу
  async deleteTable(tableName: string, cascade: boolean = true): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ragFetch(`/table/${encodeURIComponent(tableName)}?cascade=${cascade}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete table error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Очистить таблицу
  async clearTable(tableName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ragFetch(`/table/${encodeURIComponent(tableName)}/clear`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Clear table error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Поиск по документам
  async searchDocuments(query: string, limit: number = 5, relevanceScore?: number): Promise<{
    success: boolean;
    query: string;
    results: Array<{
      id: number;
      content: string;
      source: string;
      metadata: string;
      similarity: number;
    }>;
    count: number;
    threshold_used?: number;
    fallback?: boolean;
  }> {
    try {
      const response = await ragFetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit,
          ...(relevanceScore != null ? { relevanceScore, threshold: relevanceScore } : {}),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Search documents error:', error);
      return {
        success: false,
        query,
        results: [],
        count: 0
      };
    }
  },

  // Сбросить RAG агент
  async resetAgent(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await ragFetch('/reset', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Reset agent error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string; initialized: boolean; database: boolean; qwen_enabled: boolean; version: string; timestamp: string }> {
    try {
      const response = await ragFetch('/health');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        initialized: false,
        database: false,
        qwen_enabled: false,
        version: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  },

  /** POST /api/rag/analyze — intent/entities analysis */
  async analyzeQuery(
    query: string,
    options?: { sessionId?: string; intent?: string }
  ): Promise<UnknownRecord> {
    try {
      const response = await ragFetch('/analyze', {
        method: 'POST',
        body: JSON.stringify({ query, ...options }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('RAG analyze error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /** POST /api/rag/upload/semantic */
  async uploadSemantic(
    file: File,
    options?: {
      chunking_mode?: string;
      content_format?: string;
      original_source?: string;
      ifExists?: 'replace' | 'append' | 'skip';
    },
    onProgress?: (percent: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options?.content_format) formData.append('content_format', options.content_format);
    if (options?.original_source) formData.append('original_source', options.original_source);
    if (options?.ifExists) formData.append('ifExists', options.ifExists);
    return uploadWithProgress<UploadResponse>(buildRagUrl('/upload/semantic'), formData, onProgress);
  },

  /** POST /api/rag/upload/document/analyze-and-store */
  async analyzeAndStoreDocument(
    file: File,
    options?: {
      chunking_mode?: string;
      content_format?: string;
      original_source?: string;
      ifExists?: 'replace' | 'append' | 'skip';
    },
    onProgress?: (percent: number) => void
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.chunking_mode) formData.append('chunking_mode', options.chunking_mode);
    if (options?.content_format) formData.append('content_format', options.content_format);
    if (options?.original_source) formData.append('original_source', options.original_source);
    if (options?.ifExists) formData.append('ifExists', options.ifExists);
    return uploadWithProgress<DocumentUploadResponse>(
      buildRagUrl('/upload/document/analyze-and-store'),
      formData,
      onProgress
    );
  },

  /** GET /api/rag/embedding/health */
  async getEmbeddingHealth(): Promise<UnknownRecord> {
    try {
      const response = await ragFetch('/embedding/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Embedding health error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /** GET /api/rag/embedding/status */
  async getEmbeddingStatus(): Promise<UnknownRecord> {
    try {
      const response = await ragFetch('/embedding/status');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Embedding status error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /** GET /api/rag/embedding/queue */
  async getEmbeddingQueue(): Promise<UnknownRecord> {
    try {
      const response = await ragFetch('/embedding/queue');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Embedding queue error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /** GET /api/rag/artifacts/:id/download */
  async downloadArtifact(artifactId: string, filename?: string): Promise<void> {
    await downloadRagBlob(
      `/artifacts/${encodeURIComponent(artifactId)}/download`,
      filename ?? `artifact-${artifactId}`
    );
  },

  /** POST /api/rag/sync */
  async sync(options?: UnknownRecord): Promise<UnknownRecord> {
    try {
      const response = await ragFetch('/sync', {
        method: 'POST',
        body: JSON.stringify(options ?? {}),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('RAG sync error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  },
};

export default ragService;