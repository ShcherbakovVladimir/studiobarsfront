import { fetchChatApi, fetchRagApi, fetchFilesApi, getChatApiBase } from './apiClient';
import type { UnknownRecord } from '../types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  name: string;
  description?: string;
  category: string;
  mutating: boolean;
  auth?: boolean;
  pathParams: string[];
  queryKeys: string[];
  exampleBody?: unknown;
  tags: string[];
}

export interface ApiCatalog {
  title: string;
  version?: string;
  description?: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  raw: unknown;
}

export interface EndpointTestResult {
  id: string;
  success: boolean;
  status: number | null;
  durationMs: number;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export interface RunEndpointOptions {
  pathParams?: Record<string, string>;
  query?: Record<string, string>;
  bodyText?: string;
  timeoutMs?: number;
}

const HTTP_METHODS = new Set<HttpMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

const METHOD_FROM_KEY = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)/i;
const PATH_PARAM_RE = /:([A-Za-z_][\w]*)|\{([A-Za-z_][\w]*)\}/g;
const DANGEROUS_PATH =
  /\/(load|unload|swap|start|stop|delete|reset|cleanup|clear|scan|rescan|export|analyze-dataset|reindex|drop|destroy)/i;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Все',
  system: 'Система',
  models: 'Модели',
  chat: 'Чат',
  embeddings: 'Эмбеддинги',
  rag: 'RAG',
  finetune: 'Файнтюн',
  auth: 'Авторизация',
  admin: 'Админ',
  adapters: 'Адаптеры',
  chats: 'Чаты',
  monitoring: 'Мониторинг',
  tools: 'Инструменты',
  other: 'Прочее',
};

const BODY_HINTS: Array<[RegExp, unknown]> = [
  [/\/chat\/with-tools/i, { messages: [{ role: 'user', content: 'ping' }], stream: false }],
  [/\/chat\/vision/i, { message: 'Что на фото?', images: [], stream: false }],
  [/\/chat\/session/i, { sessionId: 'default' }],
  [/\/chat\/wrapper/i, { wrapper: 'default' }],
  [/\/chat/i, { message: 'ping', stream: false }],
  [/\/completion/i, { prompt: 'ping', stream: false }],
  [/\/embedding\/compare/i, { text1: 'hello', text2: 'world' }],
  [/\/embedding/i, { text: 'hello' }],
  [/\/ranking/i, { query: 'test', documents: ['документ 1', 'документ 2'] }],
  [/\/tools\/execute/i, { name: 'get_time', arguments: {} }],
  [/\/grammar\/json-schema/i, { schema: { type: 'object', properties: { name: { type: 'string' } } } }],
  [/\/model\/load/i, { modelId: '', force: false }],
  [/\/model\/swap/i, { modelId: '' }],
  [/\/model\/estimate-resources/i, { modelId: '', gpuLayers: 20, contextSize: 4096 }],
  [/\/model\/auto-configure/i, { targetGpuLayers: 'auto' }],
  [/\/finetune\/stop/i, { sessionId: '' }],
  [/\/finetune\/validate-config/i, { config: {} }],
  [/\/token-bias/i, { tokens: {}, bias: 0 }],
  [/\/functions\/documentation/i, { functions: [], format: 'markdown' }],
];

const PATH_PARAM_DEFAULTS: Record<string, string> = {
  sessionId: 'default',
  chatId: 'default',
  wrapper: 'default',
  type: 'json',
  period: '30d',
  format: 'markdown',
  limit: '10',
  offset: '0',
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asMethod(value: unknown): HttpMethod | null {
  if (typeof value !== 'string') return null;
  const method = value.trim().toUpperCase() as HttpMethod;
  return HTTP_METHODS.has(method) ? method : null;
}

function normalizePath(rawPath: string): string {
  let path = rawPath.trim();
  if (!path.startsWith('/')) path = `/${path}`;
  const qIndex = path.indexOf('?');
  if (qIndex >= 0) path = path.slice(0, qIndex);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

function extractPathParams(path: string): string[] {
  const params: string[] = [];
  path.replace(PATH_PARAM_RE, (_match, colon, brace) => {
    const name = colon || brace;
    if (name && !params.includes(name)) params.push(name);
    return '';
  });
  return params;
}

function inferCategory(path: string): string {
  const clean = path.replace(/^\/api\/?/, '/').toLowerCase();
  const segment = clean.split('/').filter(Boolean)[0] ?? '';
  if (['health', 'ping', 'status', 'ready', 'config', 'system', 'server', 'info'].includes(segment) || clean === '/') {
    return 'system';
  }
  if (segment === 'models' || segment === 'model') return 'models';
  if (['chat', 'completion', 'grammar', 'functions', 'wrappers'].includes(segment)) return 'chat';
  if (segment === 'tools') return 'tools';
  if (segment === 'embedding' || segment === 'embeddings' || segment === 'ranking') return 'embeddings';
  if (segment === 'rag') return 'rag';
  if (segment === 'finetune') return 'finetune';
  if (segment === 'auth' || segment === 'user') return 'auth';
  if (segment === 'admin') return 'admin';
  if (segment === 'adapters' || segment === 'adapter') return 'adapters';
  if (segment === 'chats') return 'chats';
  if (segment === 'monitoring') return 'monitoring';
  return 'other';
}

function isMutating(method: HttpMethod, path: string): boolean {
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') return true;
  return DANGEROUS_PATH.test(path);
}

function endpointId(method: HttpMethod, path: string): string {
  return `${method} ${path}`;
}

function nameFromPath(method: HttpMethod, path: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  const leaf = path.split('/').filter(Boolean).slice(-2).join('/');
  return `${method} ${leaf || path}`;
}

function toEndpoint(partial: {
  method: HttpMethod;
  path: string;
  name?: string;
  description?: string;
  category?: string;
  auth?: boolean;
  exampleBody?: unknown;
  queryKeys?: string[];
  tags?: string[];
}): ApiEndpoint {
  const path = normalizePath(partial.path);
  const method = partial.method;
  return {
    id: endpointId(method, path),
    method,
    path,
    name: nameFromPath(method, path, partial.name),
    description: partial.description,
    category: partial.category || inferCategory(path),
    mutating: isMutating(method, path),
    auth: partial.auth,
    pathParams: extractPathParams(path),
    queryKeys: partial.queryKeys ?? [],
    exampleBody: partial.exampleBody,
    tags: partial.tags ?? [],
  };
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function parseEndpointObject(item: UnknownRecord, fallbackCategory?: string): ApiEndpoint | null {
  const method = asMethod(item.method ?? item.httpMethod ?? item.verb);
  const path = pickString(item.path, item.url, item.route, item.endpoint);
  if (!method || !path) {
    const fromKey = pickString(item.name, item.id);
    if (fromKey) {
      const match = fromKey.match(METHOD_FROM_KEY);
      if (match?.[1] && match[2]) {
        return toEndpoint({
          method: match[1].toUpperCase() as HttpMethod,
          path: match[2],
          name: pickString(item.summary, item.title, item.name),
          description: pickString(item.description, item.desc, item.summary),
          category: pickString(item.category, item.group, item.tag, fallbackCategory),
          auth: typeof item.auth === 'boolean' ? item.auth : undefined,
          exampleBody: item.example ?? item.body ?? item.exampleBody ?? item.requestBody,
        });
      }
    }
    return null;
  }

  const queryKeys: string[] = [];
  if (Array.isArray(item.parameters)) {
    for (const param of item.parameters) {
      if (isRecord(param) && param.in === 'query' && typeof param.name === 'string') {
        queryKeys.push(param.name);
      }
    }
  } else if (isRecord(item.query)) {
    queryKeys.push(...Object.keys(item.query));
  }

  return toEndpoint({
    method,
    path,
    name: pickString(item.summary, item.title, item.name, item.operationId),
    description: pickString(item.description, item.desc, item.summary),
    category: pickString(item.category, item.group, item.tag, fallbackCategory),
    auth: typeof item.auth === 'boolean' ? item.auth : typeof item.authenticated === 'boolean' ? item.authenticated : undefined,
    exampleBody: extractExampleBody(item),
    queryKeys,
    tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === 'string') : undefined,
  });
}

function extractExampleBody(item: UnknownRecord): unknown {
  if (item.example !== undefined) return item.example;
  if (item.exampleBody !== undefined) return item.exampleBody;
  if (item.body !== undefined && (!isRecord(item.body) || item.body.content === undefined)) {
    return item.body;
  }
  const requestBody = item.requestBody;
  if (isRecord(requestBody)) {
    const content = isRecord(requestBody.content) ? requestBody.content : requestBody;
    const json = isRecord(content) ? (content['application/json'] ?? content.json) : undefined;
    if (isRecord(json)) {
      return json.example ?? json.examples ?? json.schema;
    }
    return requestBody.example;
  }
  return undefined;
}

function collectFromMethodPathString(value: string, category?: string): ApiEndpoint | null {
  const match = value.trim().match(METHOD_FROM_KEY);
  if (!match?.[1] || !match[2]) return null;
  return toEndpoint({
    method: match[1].toUpperCase() as HttpMethod,
    path: match[2],
    category,
  });
}

function parseOpenApi(raw: UnknownRecord): ApiEndpoint[] {
  const paths = raw.paths;
  if (!isRecord(paths)) return [];
  const endpoints: ApiEndpoint[] = [];

  for (const [path, ops] of Object.entries(paths)) {
    if (!isRecord(ops)) continue;
    for (const [methodKey, operation] of Object.entries(ops)) {
      const method = asMethod(methodKey);
      if (!method || !isRecord(operation)) continue;
      const parsed = parseEndpointObject({
        ...operation,
        method,
        path,
      });
      if (parsed) endpoints.push(parsed);
    }
  }
  return endpoints;
}

function walkCatalog(
  node: unknown,
  acc: ApiEndpoint[],
  depth: number,
  category?: string,
  fromRoutes = false,
  parentPath?: string
): void {
  if (depth > 8 || node == null) return;

  if (typeof node === 'string') {
    const parsed = collectFromMethodPathString(node, category);
    if (parsed) {
      acc.push(parsed);
      return;
    }
    if (fromRoutes && node.trim().startsWith('/')) {
      acc.push(toEndpoint({ method: 'GET', path: node.trim(), category }));
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) walkCatalog(item, acc, depth + 1, category, fromRoutes, parentPath);
    return;
  }

  if (!isRecord(node)) return;

  const asEndpoint = parseEndpointObject(node, category);
  if (asEndpoint) {
    acc.push(asEndpoint);
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const keyMatch = key.match(METHOD_FROM_KEY);
    if (keyMatch?.[1] && keyMatch[2]) {
      const description = typeof value === 'string' ? value : pickString(isRecord(value) ? value.description : undefined);
      const extra = isRecord(value) ? value : {};
      acc.push(
        toEndpoint({
          method: keyMatch[1].toUpperCase() as HttpMethod,
          path: keyMatch[2],
          description,
          category: pickString(extra.category, category),
          exampleBody: isRecord(value) ? extractExampleBody(value) : undefined,
        })
      );
      continue;
    }

    const methodKey = asMethod(key);
    if (methodKey && isRecord(value) && parentPath) {
      const parsed = parseEndpointObject({ ...value, method: methodKey, path: parentPath }, category);
      if (parsed) acc.push(parsed);
      continue;
    }

    if (key.startsWith('/') && (isRecord(value) || Array.isArray(value))) {
      walkCatalog(value, acc, depth + 1, category, true, normalizePath(key));
      continue;
    }

    if (['endpoints', 'routes', 'paths', 'api', 'methods', 'operations', 'resources'].includes(key)) {
      walkCatalog(value, acc, depth + 1, category, true, parentPath);
      continue;
    }

    const nestedCategory = CATEGORY_LABELS[key] ? key : category;
    if (isRecord(value) || Array.isArray(value) || typeof value === 'string') {
      walkCatalog(value, acc, depth + 1, nestedCategory, fromRoutes, parentPath);
    }
  }
}

function dedupe(endpoints: ApiEndpoint[]): ApiEndpoint[] {
  const seen = new Map<string, ApiEndpoint>();
  for (const endpoint of endpoints) {
    if (!seen.has(endpoint.id)) seen.set(endpoint.id, endpoint);
  }
  return [...seen.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function parseApiCatalog(raw: unknown, baseUrl: string): ApiCatalog {
  const record = isRecord(raw) ? raw : {};
  const title = pickString(record.name, record.title, record.service) ?? 'Barsseek API';
  const version = pickString(record.version, record.apiVersion);
  const description = pickString(record.description, record.info);

  let endpoints: ApiEndpoint[] = [];
  if (record.openapi || record.swagger) {
    endpoints = parseOpenApi(record);
  }
  if (endpoints.length === 0) {
    walkCatalog(raw, endpoints, 0);
  }

  return {
    title,
    version,
    description,
    baseUrl,
    endpoints: dedupe(endpoints),
    raw,
  };
}

export async function fetchApiCatalog(): Promise<ApiCatalog> {
  const baseUrl = getChatApiBase();
  const response = await fetchChatApi('/', {}, 20_000);
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text.trim() ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `GET /api вернул не JSON (${response.status} ${response.statusText}). Ожидался каталог эндпоинтов.`
    );
  }

  if (!response.ok) {
    const message =
      isRecord(parsed) && typeof parsed.error === 'string'
        ? parsed.error
        : `GET /api: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return parseApiCatalog(parsed, baseUrl);
}

export function defaultPathParams(endpoint: ApiEndpoint): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of endpoint.pathParams) {
    values[name] = PATH_PARAM_DEFAULTS[name] ?? '';
  }
  return values;
}

export function defaultQuery(endpoint: ApiEndpoint): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of endpoint.queryKeys) {
    values[key] = PATH_PARAM_DEFAULTS[key] ?? '';
  }
  return values;
}

export function defaultBodyText(endpoint: ApiEndpoint): string {
  if (endpoint.method === 'GET' || endpoint.method === 'HEAD' || endpoint.method === 'OPTIONS') {
    return '';
  }
  if (endpoint.exampleBody !== undefined) {
    try {
      return JSON.stringify(endpoint.exampleBody, null, 2);
    } catch {
      return String(endpoint.exampleBody);
    }
  }
  for (const [pattern, body] of BODY_HINTS) {
    if (pattern.test(endpoint.path)) {
      return JSON.stringify(body, null, 2);
    }
  }
  return '{\n  \n}';
}

export function isSafeToAutoTest(endpoint: ApiEndpoint): boolean {
  if (endpoint.mutating) return false;
  if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.method !== 'OPTIONS') {
    return false;
  }
  return endpoint.pathParams.every((name) => Boolean(PATH_PARAM_DEFAULTS[name]));
}

function applyPathParams(path: string, params: Record<string, string>): string {
  return path.replace(PATH_PARAM_RE, (full, colon, brace) => {
    const name = colon || brace;
    const value = params[name];
    if (!value) return full;
    return encodeURIComponent(value);
  });
}

function buildQueryString(query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key.trim() && value.trim()) params.set(key.trim(), value);
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

function isRagPath(path: string): boolean {
  return /(?:^|\/)rag(?:\/|$)/i.test(path);
}

function isFilesPath(path: string): boolean {
  return /(?:^|\/)api\/files(?:\/|$)/i.test(path) || /^\/files(?:\/|$)/i.test(path);
}

export async function runEndpointTest(
  endpoint: ApiEndpoint,
  options: RunEndpointOptions = {}
): Promise<EndpointTestResult> {
  const started = performance.now();
  const timestamp = new Date().toISOString();
  const pathParams = { ...defaultPathParams(endpoint), ...options.pathParams };
  const unresolved = endpoint.pathParams.filter((name) => !pathParams[name]?.trim());
  if (unresolved.length > 0) {
    return {
      id: endpoint.id,
      success: false,
      status: null,
      durationMs: Math.round(performance.now() - started),
      error: `Заполните параметры пути: ${unresolved.join(', ')}`,
      timestamp,
    };
  }

  const path = `${applyPathParams(endpoint.path, pathParams)}${buildQueryString(options.query ?? {})}`;
  const init: RequestInit = { method: endpoint.method };
  const methodHasBody = endpoint.method !== 'GET' && endpoint.method !== 'HEAD';
  if (methodHasBody && options.bodyText?.trim()) {
    try {
      JSON.parse(options.bodyText);
    } catch {
      return {
        id: endpoint.id,
        success: false,
        status: null,
        durationMs: Math.round(performance.now() - started),
        error: 'Тело запроса не является валидным JSON',
        timestamp,
      };
    }
    init.body = options.bodyText;
  }

  const timeoutMs =
    options.timeoutMs ??
    ( /\/(chat|completion|finetune|rag\/query)/i.test(endpoint.path) ? 60_000 : 20_000 );

  try {
    const fetcher = isFilesPath(endpoint.path)
      ? fetchFilesApi
      : isRagPath(endpoint.path)
        ? fetchRagApi
        : fetchChatApi;
    const response = await fetcher(path, init, timeoutMs);
    const text = await response.text();
    let data: unknown = text;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
      }
    } else {
      data = { status: response.status, statusText: response.statusText };
    }

    const bodyFailed = isRecord(data) && data.success === false;
    return {
      id: endpoint.id,
      success: response.ok && !bodyFailed,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      data,
      error: bodyFailed && isRecord(data)
        ? pickString(data.error, data.message) ?? `HTTP ${response.status}`
        : response.ok
          ? undefined
          : `HTTP ${response.status} ${response.statusText}`,
      timestamp,
    };
  } catch (error) {
    return {
      id: endpoint.id,
      success: false,
      status: null,
      durationMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
      timestamp,
    };
  }
}

export { CATEGORY_LABELS };
