import { ApiError, api, buildChatApiUrl, fetchChatApi, getToken } from './apiClient';
import { readSseFrames } from '../utils/sseStream';
import { readContextLimit, type ContextLimitNotice } from '../utils/contextLimit';
import { isUsageFrame, readContextUsage, usageFromContextLimit, type ContextUsage } from '../utils/contextUsage';

export const WORKSPACE_MAX_MB = 80;
export const WORKSPACE_MAX_BYTES = WORKSPACE_MAX_MB * 1024 * 1024;
export const WORKSPACE_UPLOAD_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json', 'html', 'xml', 'rtf',
] as const;
export const WORKSPACE_UPLOAD_ACCEPT = WORKSPACE_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export type WorkspaceRecognitionStatus = 'queued' | 'processing' | 'ready' | 'error' | string;

export interface WorkspaceRecognition {
  status: WorkspaceRecognitionStatus;
  progress: number | null;
  message?: string;
  ragSource?: string;
  /** Запись `user_files`, если сервер её прислал. Картинки страниц: `GET /api/files/:fileId/pages/:page`. */
  fileId?: string;
  pageCount?: number;
}

export interface WorkspaceEntry {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number | null;
  updatedAt?: string;
  recognition?: WorkspaceRecognition;
}

export interface WorkspaceListing {
  ready: boolean;
  fileCount: number;
  truncated: boolean;
  updatedAt?: string;
  entries: WorkspaceEntry[];
}

export type WorkspaceChangeAction = 'created' | 'edited' | 'overwritten' | 'deleted' | string;

export interface WorkspaceChange {
  path: string;
  action: WorkspaceChangeAction;
  bytes?: number;
  replacements?: number;
}

export type WorkspaceConfirmAction = 'overwrite' | 'delete' | string;

export interface WorkspaceConfirmation {
  confirmationId: string;
  action: WorkspaceConfirmAction;
  path: string;
  message: string;
  expiresInSec: number | null;
  receivedAt: number;
}

export interface WorkspaceStep {
  id: string;
  name: string;
  phase: 'start' | 'done';
  success: boolean | null;
  summary?: string;
  path?: string;
  change?: WorkspaceChange;
  confirmationRequired: boolean;
}

export interface WorkspaceFileContent {
  path: string;
  /** null — сервер не отдаёт текст: бинарный файл или PDF ещё распознаётся. */
  content: string | null;
  recognition?: WorkspaceRecognition;
  message?: string;
}

export type WorkspaceWriteResult =
  | { status: 'done'; change?: WorkspaceChange }
  | { status: 'confirm'; confirmation: WorkspaceConfirmation };

export type WorkspaceConfirmResult =
  | { status: 'applied'; change?: WorkspaceChange }
  | { status: 'cancelled' };

export class WorkspaceConfirmationExpiredError extends Error {
  constructor() {
    super('Запрос подтверждения устарел (15 минут). Повторите действие.');
    this.name = 'WorkspaceConfirmationExpiredError';
  }
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function workspaceFileExtension(path: string): string {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

const WORKSPACE_IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

/** Путь картинки из Markdown относительно файла в рабочей папке. Внешние URL не трогает. */
export function resolveWorkspaceAssetPath(markdownPath: string, src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || /^(https?:|data:|blob:|mailto:)/i.test(trimmed)) return null;
  const withoutHash = trimmed.split('#')[0]?.split('?')[0] ?? trimmed;
  let decoded = withoutHash;
  try {
    decoded = decodeURIComponent(withoutHash);
  } catch {
    decoded = withoutHash;
  }
  const fromRoot = decoded.startsWith('/');
  const baseDir = markdownPath.includes('/') ? markdownPath.slice(0, markdownPath.lastIndexOf('/')) : '';
  const parts = fromRoot ? [] : baseDir.split('/').filter(Boolean);
  for (const segment of decoded.replace(/^\/+/, '').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.length > 0 ? parts.join('/') : null;
}

const WORKSPACE_IMAGE_EXTENSIONS = new Set(Object.keys(WORKSPACE_IMAGE_TYPES));

function workspaceBaseName(path: string): string {
  return path.split('/').pop() ?? path;
}

function workspaceDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : '';
}

function workspaceStem(path: string): string {
  const name = workspaceBaseName(path);
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
}

function captionSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Картинку из Markdown берём только если такой файл есть в списке рабочей папки.
 * Имена вроде `login-screen.png` и `image` из текста PDF на диске не лежат:
 * снимки страниц отдаёт `GET /api/files/:fileId/pages/:page`.
 */
export function matchWorkspaceImage(
  entries: WorkspaceEntry[],
  markdownPath: string,
  src: string,
  alt?: string
): string | null {
  const images = entries.filter(
    (entry) => entry.type !== 'dir' && WORKSPACE_IMAGE_EXTENSIONS.has(workspaceFileExtension(entry.path))
  );
  const exact = resolveWorkspaceAssetPath(markdownPath, src);
  const markdownDirectory = workspaceDir(markdownPath);

  const sameName = (filePath: string, name: string) => workspaceBaseName(filePath).toLowerCase() === name.toLowerCase();
  const pick = (paths: string[]): string | null => {
    if (paths.length === 1) return paths[0] ?? null;
    const here = paths.filter((item) => workspaceDir(item) === markdownDirectory);
    return here.length === 1 ? (here[0] ?? null) : null;
  };

  if (exact) {
    const direct = images.find((entry) => entry.path.toLowerCase() === exact.toLowerCase());
    if (direct) return direct.path;
    const base = workspaceBaseName(exact);
    if (workspaceFileExtension(exact)) {
      const named = pick(images.filter((entry) => sameName(entry.path, base)).map((entry) => entry.path));
      if (named) return named;
    } else {
      const stem = workspaceStem(exact);
      const named = pick(
        images
          .filter((entry) => workspaceStem(entry.path) === stem && workspaceDir(entry.path) === markdownDirectory)
          .map((entry) => entry.path)
      );
      if (named) return named;
    }
  }

  const slug = alt ? captionSlug(alt) : '';
  if (slug) {
    const byCaption = pick(
      images
        .filter((entry) => captionSlug(workspaceStem(entry.path)) === slug)
        .map((entry) => entry.path)
    );
    if (byCaption) return byCaption;
  }

  return null;
}

export function isWorkspaceUploadable(file: File): boolean {
  return (WORKSPACE_UPLOAD_EXTENSIONS as readonly string[]).includes(workspaceFileExtension(file.name));
}

export function isRecognitionPending(recognition?: WorkspaceRecognition): boolean {
  if (!recognition) return false;
  return recognition.status !== 'ready' && recognition.status !== 'error';
}

function readRecognition(raw: unknown): WorkspaceRecognition | undefined {
  const row = asRecord(raw);
  if (!row) return undefined;
  const fileIdRaw = row.fileId ?? row.file_id;
  const fileId = asString(fileIdRaw) ?? (typeof fileIdRaw === 'number' && Number.isFinite(fileIdRaw) ? String(fileIdRaw) : undefined);
  return {
    status: asString(row.status) ?? 'queued',
    progress: asNumber(row.progress),
    message: asString(row.message),
    ragSource: asString(row.ragSource),
    fileId,
    pageCount: asNumber(row.pageCount) ?? asNumber(row.page_count) ?? undefined,
  };
}

function readEntry(raw: unknown): WorkspaceEntry | null {
  const row = asRecord(raw);
  const path = asString(row?.path);
  if (!row || !path) return null;
  const type = row.type === 'dir' || row.type === 'directory' || row.type === 'folder' ? 'dir' : 'file';
  return {
    path: path.replace(/^\/+/, ''),
    name: asString(row.name) ?? path.split('/').pop() ?? path,
    type,
    size: asNumber(row.size),
    updatedAt: asString(row.updatedAt),
    recognition: readRecognition(row.recognition),
  };
}

export function readChange(raw: unknown): WorkspaceChange | undefined {
  const row = asRecord(raw);
  const path = asString(row?.path);
  const action = asString(row?.action);
  if (!row || !path || !action) return undefined;
  return {
    path,
    action,
    bytes: asNumber(row.bytes) ?? undefined,
    replacements: asNumber(row.replacements) ?? undefined,
  };
}

export function readConfirmation(raw: unknown): WorkspaceConfirmation | null {
  const outer = asRecord(raw);
  const row = asRecord(outer?.confirmation) ?? outer;
  const confirmationId = asString(row?.confirmationId ?? row?.id);
  if (!row || !confirmationId) return null;
  return {
    confirmationId,
    action: asString(row.action) ?? 'overwrite',
    path: asString(row.path) ?? '',
    message: asString(row.message) ?? 'Подтвердите действие с файлом.',
    expiresInSec: asNumber(row.expiresInSec),
    receivedAt: Date.now(),
  };
}

function parseArguments(raw: unknown): UnknownRecord | null {
  if (typeof raw === 'string') {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

function readStep(raw: unknown): WorkspaceStep | null {
  const row = asRecord(raw);
  if (!row) return null;
  const change = readChange(row.change);
  const args = parseArguments(row.arguments ?? row.args);
  const name = asString(row.name) ?? 'tool';
  return {
    id: asString(row.tool_call_id) ?? asString(row.id) ?? `${name}-${Date.now()}`,
    name,
    phase: row.phase === 'done' ? 'done' : 'start',
    success: typeof row.success === 'boolean' ? row.success : null,
    summary: asString(row.summary),
    path: change?.path ?? asString(row.path) ?? asString(args?.path),
    change,
    confirmationRequired: row.confirmationRequired === true,
  };
}

function errorFromBody(status: number, data: UnknownRecord, fallback: string): ApiError {
  const code = asString(data.code);
  const message = asString(data.error) ?? asString(data.message) ?? fallback;
  return new ApiError(message, status, code, data);
}

async function readJson(response: Response): Promise<UnknownRecord> {
  return ((await response.json().catch(() => ({}))) as UnknownRecord) ?? {};
}

function writeOutcome(status: number, data: UnknownRecord): WorkspaceWriteResult {
  if (status === 409 || data.confirmationRequired === true) {
    const confirmation = readConfirmation(data);
    if (confirmation) return { status: 'confirm', confirmation };
  }
  if (status === 410) throw new WorkspaceConfirmationExpiredError();
  if (status < 200 || status >= 300) throw errorFromBody(status, data, `HTTP ${status}`);
  return { status: 'done', change: readChange(data.change) };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileQuery = (path: string) => `path=${encodeURIComponent(path)}`;

// ---------------------------------------------------------------------------
// Стрим задачи POST /api/workspace/chat
// ---------------------------------------------------------------------------

export interface WorkspaceStreamHandlers {
  onStep?: (step: WorkspaceStep) => void;
  onToken?: (token: string, full: string) => void;
  onConfirmation?: (confirmation: WorkspaceConfirmation) => void;
  onUsage?: (usage: ContextUsage) => void;
  onContextLimit?: (notice: ContextLimitNotice) => void;
}

export interface WorkspaceTaskResult {
  content: string;
  changes: WorkspaceChange[];
  confirmation: WorkspaceConfirmation | null;
  sessionId?: string;
  chatId?: string;
  usage: ContextUsage | null;
  contextLimit: ContextLimitNotice | null;
  /** Стрим оборвался до `workspace.done` (стоп или сеть). */
  incomplete: boolean;
}

function streamText(parsed: UnknownRecord): string {
  const choices = parsed.choices;
  if (!Array.isArray(choices)) return '';
  const delta = asRecord(asRecord(choices[0])?.delta);
  return typeof delta?.content === 'string' ? delta.content : '';
}

function streamError(parsed: UnknownRecord): string | null {
  if (parsed.object || Array.isArray(parsed.choices)) return null;
  const error = parsed.error;
  if (typeof error === 'string' && error) return error;
  const nested = asRecord(error);
  return asString(nested?.message) ?? null;
}

export interface WorkspaceChatRequest {
  message: string;
  sessionId: string;
  maxToolIterations?: number;
}

async function runTask(
  request: WorkspaceChatRequest,
  signal: AbortSignal,
  handlers: WorkspaceStreamHandlers
): Promise<WorkspaceTaskResult> {
  const response = await fetchChatApi('/workspace/chat', {
    method: 'POST',
    headers: { Accept: 'text/event-stream' },
    body: JSON.stringify({
      message: request.message,
      sessionId: request.sessionId,
      stream: true,
      ...(request.maxToolIterations ? { max_tool_iterations: request.maxToolIterations } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const data = await readJson(response);
    const limit = readContextLimit(data);
    if (limit) handlers.onContextLimit?.(limit);
    throw errorFromBody(response.status, data, `Задача не запустилась: HTTP ${response.status}`);
  }

  const result: WorkspaceTaskResult = {
    content: '',
    changes: [],
    confirmation: null,
    usage: null,
    contextLimit: null,
    incomplete: true,
  };

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') && !contentType.includes('event-stream')) {
    const data = await readJson(response);
    const message = asRecord(data.message);
    result.content = asString(message?.content) ?? '';
    if (result.content) handlers.onToken?.(result.content, result.content);
    for (const raw of Array.isArray(data.steps) ? data.steps : []) {
      const step = readStep(raw);
      if (step) handlers.onStep?.({ ...step, phase: 'done' });
    }
    result.changes = (Array.isArray(data.changes) ? data.changes : []).map(readChange).filter(Boolean) as WorkspaceChange[];
    result.confirmation = readConfirmation(data.confirmation);
    if (result.confirmation) handlers.onConfirmation?.(result.confirmation);
    result.usage = readContextUsage(data);
    result.contextLimit = readContextLimit(data);
    result.sessionId = asString(data.sessionId);
    result.chatId = asString(data.chatId);
    result.incomplete = false;
    return result;
  }

  let failure: string | null = null;

  try {
    await readSseFrames(
      response,
      (payload) => {
        if (payload === '[DONE]') {
          result.incomplete = false;
          return 'stop';
        }
        let parsed: UnknownRecord;
        try {
          parsed = JSON.parse(payload) as UnknownRecord;
        } catch {
          return;
        }

        switch (parsed.object) {
          case 'workspace.step': {
            const step = readStep(parsed.step ?? parsed);
            if (step) handlers.onStep?.(step);
            return;
          }
          case 'workspace.confirmation': {
            const confirmation = readConfirmation(parsed);
            if (confirmation) {
              result.confirmation = confirmation;
              handlers.onConfirmation?.(confirmation);
            }
            return;
          }
          case 'workspace.done': {
            result.changes = (Array.isArray(parsed.changes) ? parsed.changes : [])
              .map(readChange)
              .filter(Boolean) as WorkspaceChange[];
            const confirmation = readConfirmation(parsed.confirmation);
            if (confirmation && confirmation.confirmationId !== result.confirmation?.confirmationId) {
              result.confirmation = confirmation;
              handlers.onConfirmation?.(confirmation);
            }
            result.sessionId = asString(parsed.sessionId) ?? result.sessionId;
            result.chatId = asString(parsed.chatId) ?? result.chatId;
            result.incomplete = false;
            return;
          }
        }

        if (isUsageFrame(parsed)) {
          result.usage = readContextUsage(parsed);
          if (result.usage) handlers.onUsage?.(result.usage);
          return;
        }

        const limit = readContextLimit(parsed);
        if (limit) {
          result.contextLimit = limit;
          result.usage ??= usageFromContextLimit(limit);
          handlers.onContextLimit?.(limit);
          return;
        }

        const error = streamError(parsed);
        if (error) {
          failure = error;
          return 'stop';
        }

        const token = streamText(parsed);
        if (!token) return;
        result.content += token;
        handlers.onToken?.(token, result.content);
      },
      signal
    );
  } catch (error) {
    if (!signal.aborted) throw error;
  }

  const failed = failure as string | null;
  if (failed) throw new Error(failed);
  return result;
}

// ---------------------------------------------------------------------------

export const workspaceService = {
  async list(): Promise<WorkspaceListing> {
    const data = await api<UnknownRecord>('/workspace');
    const row = asRecord(data.workspace) ?? data;
    const entries = (Array.isArray(row.entries) ? row.entries : [])
      .map(readEntry)
      .filter((entry): entry is WorkspaceEntry => entry !== null);
    return {
      ready: row.ready !== false,
      fileCount: asNumber(row.fileCount) ?? entries.filter((entry) => entry.type === 'file').length,
      truncated: row.truncated === true,
      updatedAt: asString(row.updatedAt),
      entries,
    };
  },

  async read(path: string): Promise<WorkspaceFileContent> {
    const data = await api<UnknownRecord>(`/workspace/file?${fileQuery(path)}`);
    const file = asRecord(data.file) ?? data;
    const content = [file.content, file.text, file.markdown].find((value) => typeof value === 'string');
    return {
      path: asString(file.path) ?? path,
      content: typeof content === 'string' ? content : null,
      recognition: readRecognition(file.recognition ?? data.recognition),
      message: asString(file.message) ?? asString(data.message),
    };
  },

  async fetchFileBlob(path: string): Promise<Blob> {
    const response = await fetchChatApi(`/workspace/file?${fileQuery(path)}&download=1`, {}, 120_000);
    if (!response.ok) {
      const data = await readJson(response);
      throw errorFromBody(response.status, data, `Не удалось открыть файл: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const mime = WORKSPACE_IMAGE_TYPES[workspaceFileExtension(path)];
    if (mime && blob.type !== mime) return new Blob([blob], { type: mime });
    return blob;
  },

  async download(path: string): Promise<void> {
    triggerDownload(await this.fetchFileBlob(path), path.split('/').pop() || 'file');
  },

  /** Новый файл сохраняется сразу, существующий — только после подтверждения. */
  async write(path: string, content: string): Promise<WorkspaceWriteResult> {
    const response = await fetchChatApi('/workspace/file', {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    });
    return writeOutcome(response.status, await readJson(response));
  },

  /** DELETE всегда отвечает 409: файл удаляется только через confirm. */
  async requestDelete(path: string): Promise<WorkspaceConfirmation> {
    const response = await fetchChatApi(`/workspace/file?${fileQuery(path)}`, { method: 'DELETE' });
    const outcome = writeOutcome(response.status, await readJson(response));
    if (outcome.status === 'confirm') return outcome.confirmation;
    throw new Error('Сервер удалил файл без подтверждения');
  },

  async confirm(confirmationId: string, approve: boolean): Promise<WorkspaceConfirmResult> {
    const response = await fetchChatApi('/workspace/confirm', {
      method: 'POST',
      body: JSON.stringify({ confirmationId, approve }),
    });
    const data = await readJson(response);
    if (response.status === 410 || data.code === 'CONFIRMATION_EXPIRED') {
      throw new WorkspaceConfirmationExpiredError();
    }
    if (!response.ok) throw errorFromBody(response.status, data, `Подтверждение не прошло: HTTP ${response.status}`);
    if (data.cancelled === true || !approve) return { status: 'cancelled' };
    return { status: 'applied', change: readChange(data.change) };
  },

  upload(
    file: File,
    folder?: string,
    onProgress?: (percent: number) => void
  ): Promise<WorkspaceWriteResult> {
    if (!isWorkspaceUploadable(file)) {
      return Promise.reject(new Error(`Формат «${file.name}» не поддерживается`));
    }
    if (file.size > WORKSPACE_MAX_BYTES) {
      return Promise.reject(new Error(`«${file.name}» больше ${WORKSPACE_MAX_MB} МБ`));
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);
      if (folder) form.append('path', folder);
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener('load', () => {
        let data: UnknownRecord = {};
        try {
          data = JSON.parse(xhr.responseText || '{}') as UnknownRecord;
        } catch {
          /* пустое или не-JSON тело */
        }
        try {
          resolve(writeOutcome(xhr.status, data));
        } catch (error) {
          reject(error);
        }
      });
      xhr.addEventListener('error', () => reject(new Error(`Сеть: не удалось загрузить «${file.name}»`)));
      xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));
      xhr.open('POST', buildChatApiUrl('/workspace/upload'));
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(form);
    });
  },

  runTask,
};

export default workspaceService;
