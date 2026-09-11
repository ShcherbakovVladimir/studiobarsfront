import { TOKEN_KEY } from '../constants/auth';
import {
  DEFAULT_CHAT_API_BASE,
  resolveChatApiBase as pickChatApiBase,
  resolveRagApiBase as pickRagApiBase,
} from '../constants/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function normalizeBase(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function resolveChatApiBase(): string {
  return pickChatApiBase();
}

function resolveRagApiBase(): string {
  return pickRagApiBase();
}

let chatApiBase = resolveChatApiBase();
let ragApiBase = resolveRagApiBase();

export function setApiBases(chatUrl: string, ragUrl: string): void {
  chatApiBase = normalizeBase(chatUrl);
  ragApiBase = normalizeBase(ragUrl);
}

export function getChatApiBase(): string {
  return chatApiBase;
}

export function getRagApiBase(): string {
  return ragApiBase;
}

/** Origin without `/api` suffix — for GET /health at host root */
export function getChatApiOrigin(): string {
  const base = getChatApiBase();
  if (base.endsWith('/api')) return base.slice(0, -4);
  try {
    const url = new URL(base.startsWith('http') ? base : `https://${base}`);
    return url.origin;
  } catch {
    return base.replace(/\/api\/?$/, '');
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type UnauthorizedHandler = () => void;
type MaintenanceHandler = (data: unknown) => void;
type ForbiddenHandler = (message: string, code?: string) => void;

function defaultUnauthorizedHandler(): void {
  clearToken();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

let onUnauthorized: UnauthorizedHandler = defaultUnauthorizedHandler;
let onMaintenance: MaintenanceHandler = () => {};
let onForbidden: ForbiddenHandler = () => {};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

export function resetUnauthorizedHandler(): void {
  onUnauthorized = defaultUnauthorizedHandler;
}

export function setMaintenanceHandler(handler: MaintenanceHandler): void {
  onMaintenance = handler;
}

export function setForbiddenHandler(handler: ForbiddenHandler): void {
  onForbidden = handler;
}

/** Trigger auth/maintenance handlers without consuming the original response body. */
async function applyResponseAuthHandlers(res: Response): Promise<void> {
  if (res.status === 401) {
    onUnauthorized();
    return;
  }

  if (res.status === 503) {
    const data = await res.clone().json().catch(() => ({})) as { code?: string };
    if (data.code === 'MAINTENANCE') {
      onMaintenance(data);
    }
    return;
  }

  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({})) as { error?: string; code?: string };
    onForbidden(data.error ?? 'Доступ запрещён', data.code);
  }
}

function buildUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }
  return `${base}${normalizedPath}`;
}

export function buildUrlForDownload(base: string, path: string): string {
  return buildUrl(base, path);
}

export function buildChatApiUrl(path: string): string {
  return buildUrl(chatApiBase, path);
}

export function buildFilesApiUrl(path: string): string {
  return buildUrl(ragApiBase, toFilesApiPath(path));
}

function toFilesApiPath(path: string): string {
  if (path.startsWith('/api/files')) return path;
  if (path.startsWith('?')) return `/api/files${path}`;
  if (path.startsWith('/files')) return `/api${path}`;
  return `/api/files${path.startsWith('/') ? path : `/${path}`}`;
}

/** Host root without `/api` — for llama proxy routes (`/v1/completions`, `/completions`, …). */
export function buildChatOriginUrl(path: string): string {
  return buildUrl(getChatApiOrigin(), path);
}

export function buildAuthHeaders(options?: HeadersInit): Headers {
  const headers = new Headers(options);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function fetchWithBase(
  buildUrlFn: (path: string) => string,
  path: string,
  options: RequestInit = {},
  timeoutMs = 60_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = options.signal ? null : setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const headers = buildAuthHeaders(options.headers);
    if (options.body instanceof FormData) {
      headers.delete('Content-Type');
    }
    const res = await fetch(buildUrlFn(path), { ...options, headers, signal });
    await applyResponseAuthHandlers(res);
    return res;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Raw fetch with auth, timeout, and runtime base URL (streaming / non-JSON). */
export async function fetchChatApi(
  path: string,
  options: RequestInit = {},
  timeoutMs = 60_000
): Promise<Response> {
  return fetchWithBase(buildChatApiUrl, path, options, timeoutMs);
}

/** Fetch llama proxy routes at host root (`POST /v1/completions`, not `/api/v1/...`). */
export async function fetchChatOriginApi(
  path: string,
  options: RequestInit = {},
  timeoutMs = 60_000
): Promise<Response> {
  return fetchWithBase(buildChatOriginUrl, path, options, timeoutMs);
}

/** Raw RAG fetch with auth and 401/maintenance handling (streaming / multipart). */
export async function fetchRagApi(
  path: string,
  options: RequestInit = {},
  timeoutMs = 120_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = options.signal ? null : setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const headers = buildAuthHeaders(options.headers);
    if (options.body instanceof FormData) {
      headers.delete('Content-Type');
    }
    const ragPath = path.startsWith('/api/rag')
      ? path
      : `/api/rag${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(buildUrl(ragApiBase, ragPath), {
      ...options,
      headers,
      signal,
      credentials: 'include',
    });
    await applyResponseAuthHandlers(res);
    return res;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const candidates = [data.error, data.message, data.detail, data.details];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  baseUrl: string = chatApiBase
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(buildUrl(baseUrl, path), { ...options, headers });

  let parsedBody: Record<string, unknown> | null = null;
  const readBody = async (): Promise<Record<string, unknown>> => {
    if (parsedBody !== null) return parsedBody;
    parsedBody = await res.json().catch(() => ({})) as Record<string, unknown>;
    return parsedBody;
  };

  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError('UNAUTHORIZED', 401, 'UNAUTHORIZED');
  }

  if (res.status === 503) {
    const data = await readBody();
    if (data.code === 'MAINTENANCE') {
      onMaintenance(data);
      throw new ApiError('MAINTENANCE', 503, 'MAINTENANCE', data);
    }
  }

  if (res.status === 403) {
    const data = await readBody();
    const message = apiErrorMessage(data, 'Доступ запрещён');
    const code = typeof data.code === 'string' ? data.code : 'FORBIDDEN';
    onForbidden(message, code);
    throw new ApiError(message, 403, code, data);
  }

  const data = await readBody();
  if (!res.ok) {
    throw new ApiError(
      apiErrorMessage(data, res.statusText || `HTTP ${res.status}`),
      res.status,
      typeof data.code === 'string' ? data.code : undefined,
      data
    );
  }

  return data as T;
}

export async function ragApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ragPath = path.startsWith('/api/rag')
    ? path
    : `/api/rag${path.startsWith('/') ? path : `/${path}`}`;
  return api<T>(ragPath, options, ragApiBase);
}

export async function filesApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  return api<T>(toFilesApiPath(path), options, ragApiBase);
}

export async function fetchFilesApi(
  path: string,
  options: RequestInit = {},
  timeoutMs = 120_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = options.signal ? null : setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const headers = buildAuthHeaders(options.headers);
    if (options.body instanceof FormData) {
      headers.delete('Content-Type');
    }
    const res = await fetch(buildFilesApiUrl(path), {
      ...options,
      headers,
      signal,
      credentials: 'include',
    });
    await applyResponseAuthHandlers(res);
    return res;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchPublicConfig(): Promise<{ success: boolean; config: import('../types').RuntimeConfig }> {
  const bases = [resolveChatApiBase(), DEFAULT_CHAT_API_BASE, 'http://localhost:3001/api'];
  const seen = new Set<string>();
  let lastError: unknown;

  for (const base of bases) {
    const normalized = normalizeBase(base);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    try {
      const res = await fetch(buildUrl(normalized, '/config'));
      if (!res.ok) continue;
      return await res.json() as { success: boolean; config: import('../types').RuntimeConfig };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load runtime config');
}
