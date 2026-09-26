import { fetchChatApi } from './apiClient';

export interface LlamaLaunch {
  fit?: boolean;
  contextSize?: number;
  gpuLayers?: number;
  parallel?: number;
  tensorSplit?: string;
  mainGpu?: number;
  cpuMoe?: boolean;
  nCpuMoe?: number;
  mmproj?: string;
  jinja?: boolean;
  chatTemplate?: string;
  reasoning?: 'on' | 'off' | 'auto' | '';
  reasoningFormat?: string;
  reasoningBudget?: number;
  chatTemplateKwargs?: Record<string, unknown>;
  draftModel?: string;
  draftMax?: number;
  specType?: string;
  metrics?: boolean;
  apiKey?: string;
  cudaVisibleDevices?: string;
  batchSize?: number;
  ubatchSize?: number;
  threads?: number;
  threadsBatch?: number;
  cacheTypeK?: string;
  cacheTypeV?: string;
  defragThold?: number;
  mlock?: boolean;
  noMmap?: boolean;
  embedding?: boolean;
  ropeScaling?: string;
  ropeScale?: number;
  ropeFreqBase?: number;
  draftGpuLayers?: number;
  hfRepo?: string;
  hfFile?: string;
  router?: boolean;
  modelsPreset?: string;
  modelsMax?: number;
  binaryPath?: string;
  useSavedBinary?: boolean;
  env?: Record<string, string>;
  extraArgs?: string[];
}

export interface LaunchProfile {
  name: string;
  launch?: LlamaLaunch;
}

export interface LaunchExtras {
  fields?: unknown;
  profiles?: LaunchProfile[] | string[];
  lastApplied?: { launch?: LlamaLaunch; launchProfile?: string; at?: string };
}

export interface LaunchPreview {
  args?: string[];
  binary?: string;
  cudaVisibleDevices?: string;
  envKeys?: string[];
  routerModel?: string;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.error || data.message || `${response.status}`);
  }
  return data;
}

/** load/swap держат запрос до конца рестарта llama-server. */
export const MODEL_LOAD_TIMEOUT_MS = 600_000;

const FALSE_IS_MEANINGFUL = new Set(['mlock', 'noMmap', 'embedding']);

const isMasked = (value: unknown) => typeof value === 'string' && /\*{3,}|^•+$|^<hidden>$/i.test(value);

/** apiKey и HF_TOKEN в lastApplied приходят маскированными — отправлять их обратно нельзя. */
export function sanitizeAppliedLaunch(launch: LlamaLaunch): LlamaLaunch {
  const { apiKey, env, ...rest } = launch;
  const next: LlamaLaunch = { ...rest };
  if (apiKey && !isMasked(apiKey)) next.apiKey = apiKey;
  if (env) {
    const cleanEnv = Object.fromEntries(Object.entries(env).filter(([, value]) => !isMasked(value)));
    if (Object.keys(cleanEnv).length) next.env = cleanEnv;
  }
  return next;
}

const SHELL_CHARS = /[\s;&|`$<>(){}'"\\]/;
const ENV_KEY = /^(CUDA_\w+|GGML_\w+|HF_TOKEN)$/;

export function validateLaunch(launch: LlamaLaunch): string[] {
  const errors: string[] = [];
  const extra = launch.extraArgs ?? [];
  if (extra.length > 40) errors.push('extraArgs: не больше 40 токенов');
  const forbidden = extra.filter((token) => FORBIDDEN_EXTRA_FLAGS.has(token.split('=')[0] ?? token));
  if (forbidden.length) errors.push(`extraArgs: ${forbidden.join(', ')} задаются полями формы`);
  if (extra.some((token) => SHELL_CHARS.test(token))) errors.push('extraArgs: без пробелов и shell-символов');
  if ((launch.hfRepo || launch.hfFile) && launch.modelsPreset) errors.push('hf-repo / hf-file нельзя вместе с models-preset');
  if (launch.hfFile && !launch.hfRepo) errors.push('hf-file требует hf-repo');
  if (launch.router && !launch.modelsPreset) errors.push('Роутер требует models-preset');
  if (launch.defragThold !== undefined && (launch.defragThold < 0 || launch.defragThold > 1)) {
    errors.push('defrag-thold: число от 0 до 1');
  }
  const envKeys = Object.keys(launch.env ?? {});
  if (envKeys.length > 20) errors.push('env: не больше 20 переменных');
  const badEnv = envKeys.filter((key) => !ENV_KEY.test(key));
  if (badEnv.length) errors.push(`env: разрешены только CUDA_*, GGML_*, HF_TOKEN (${badEnv.join(', ')})`);
  return errors;
}

export class ModelLoadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export interface LoadLaunchOptions {
  launch?: LlamaLaunch;
  launchProfile?: string;
  force?: boolean;
}

/** Текст ошибки POST /api/model/load по таблице кодов из FRONTEND_SERVER_MODEL_CONTROL §4. */
export function describeLoadError(status: number, body: unknown): string {
  const data = asRecord(body);
  const code = pickString(data, ['code']);
  const detail = pickString(data, ['error', 'message']) ?? '';
  if (code === 'INVALID_LAUNCH') return `Неверные флаги запуска: ${detail}`;
  if (code === 'LAUNCH_PROFILE_NOT_FOUND') return `Профиль запуска не найден: ${detail}`;
  if (status === 404) return `Модель не найдена: ${detail || status}`;
  if (status === 409) return `Есть активные inference-сессии: ${detail || 'нужен force'}`;
  if (status === 500 && data.reverted) {
    const current = pickString(data, ['currentModel']);
    return `Загрузка не удалась, откат${current ? ` на ${current}` : ''}: ${detail}`;
  }
  if (status === 500 && data.serverState === 'unloaded') return `Загрузка не удалась, модель выгружена: ${detail}`;
  return detail || `HTTP ${status}`;
}

export interface SwapCompatibility {
  modelCompatible: boolean;
  reason?: string;
  sessionWouldBeDropped: boolean;
  willDropIncompatible: boolean;
  forceRequired: boolean;
  preserveSessions: boolean;
  activeSessions: number;
}

/** `GET /api/model/compatibility/:modelId?sessionId=` — вызывать до swap (§7). */
export async function getSwapCompatibility(modelId: string, sessionId?: string): Promise<SwapCompatibility> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  const response = await fetchChatApi(`/model/compatibility/${encodeURIComponent(modelId)}${query}`, { method: 'GET' });
  const data = asRecord(await readJson<unknown>(response));
  const compat = asRecord(data.compatibility);
  const session = asRecord(data.sessionCompatibility);
  const canSwap = asRecord(data.canSwap);
  return {
    modelCompatible: compat.compatible !== false,
    reason: pickString(compat, ['reason']),
    sessionWouldBeDropped: session.wouldBeDropped === true,
    willDropIncompatible: canSwap.willDropIncompatible === true,
    forceRequired: canSwap.forceRequired === true,
    preserveSessions: canSwap.preserveSessions !== false,
    activeSessions: pickNumber(data, ['activeSessions']) ?? 0,
  };
}

/** Флаги, которые бэкенд реально дописал в argv (`launch.applied` в ответе load). */
export function appliedLaunchFlags(body: unknown): string[] {
  const launch = asRecord(asRecord(body).launch);
  return Array.isArray(launch.applied) ? launch.applied.filter((item): item is string => typeof item === 'string') : [];
}

export function compactLaunch(launch: LlamaLaunch): LlamaLaunch {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(launch)) {
    if (value === undefined || value === '' || value === null) continue;
    if (value === false && !FALSE_IS_MEANINGFUL.has(key)) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) continue;
    next[key] = value;
  }
  return next as LlamaLaunch;
}

export async function getLaunchExtras(): Promise<LaunchExtras> {
  const response = await fetchChatApi('/model/launch-extras', { method: 'GET' });
  return readJson(response);
}

export async function previewLaunch(body: {
  modelId: string;
  launch?: LlamaLaunch;
  launchProfile?: string;
}): Promise<LaunchPreview> {
  const response = await fetchChatApi('/model/launch-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await readJson<{ preview?: LaunchPreview } & LaunchPreview>(response);
  return data.preview ?? data;
}

export async function saveLaunchProfile(name: string, launch: LlamaLaunch): Promise<void> {
  const response = await fetchChatApi('/model/launch-profiles', {
    method: 'POST',
    body: JSON.stringify({ name, launch: compactLaunch(launch) }),
  });
  await readJson(response);
}

export async function deleteLaunchProfile(name: string): Promise<void> {
  const response = await fetchChatApi(`/model/launch-profiles/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  await readJson(response);
}

export interface ArtifactFile {
  path: string;
  name: string;
  sizeGb?: number;
}

export interface Artifacts {
  models: ArtifactFile[];
  mmproj: ArtifactFile[];
  draft: ArtifactFile[];
}

export interface GpuRow {
  index: string;
  name: string;
  freeGb?: number;
  totalGb?: number;
}

export interface GpuInfo {
  gpus: GpuRow[];
  tensorSplit?: string;
  order?: string;
}

type Row = Record<string, unknown>;

const asRecord = (value: unknown): Row => (value && typeof value === 'object' ? (value as Row) : {});

const pickNumber = (row: Row, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = Number(row[key]);
    if (row[key] !== undefined && row[key] !== null && Number.isFinite(value)) return value;
  }
  return undefined;
};

const pickString = (row: Row, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

const baseName = (path: string) => path.split(/[\\/]/).pop() || path;

function toArtifactFiles(value: unknown): ArtifactFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ArtifactFile | null => {
      if (typeof item === 'string') return { path: item, name: baseName(item) };
      const row = asRecord(item);
      const path = pickString(row, ['path', 'file', 'fullPath', 'name']);
      if (!path) return null;
      const sizeBytes = pickNumber(row, ['sizeBytes', 'size_bytes', 'bytes']);
      return {
        path,
        name: pickString(row, ['name', 'filename']) ?? baseName(path),
        sizeGb: pickNumber(row, ['sizeGb', 'size_gb']) ?? (sizeBytes ? sizeBytes / 1024 ** 3 : undefined),
      };
    })
    .filter((row): row is ArtifactFile => row !== null);
}

export async function listArtifacts(): Promise<Artifacts> {
  const response = await fetchChatApi('/model/artifacts', { method: 'GET' });
  const data = asRecord(await readJson<unknown>(response));
  const root = data.artifacts ? asRecord(data.artifacts) : data;
  return {
    models: toArtifactFiles(root.models),
    mmproj: toArtifactFiles(root.mmproj),
    draft: toArtifactFiles(root.draft ?? root.drafts),
  };
}

export async function listGpus(): Promise<GpuInfo> {
  const response = await fetchChatApi('/model/gpus', { method: 'GET' });
  const data = asRecord(await readJson<unknown>(response));
  const rows = Array.isArray(data.gpus) ? data.gpus : [];
  const tensorSplit = data.tensorSplit ?? data.tensor_split;
  const order = data.order ?? data.cudaVisibleDevices;
  return {
    gpus: rows.map((item, i) => {
      const row = asRecord(item);
      const freeMb = pickNumber(row, ['freeMb', 'memory_free_mb', 'free_mb', 'memoryFreeMb']);
      const totalMb = pickNumber(row, ['totalMb', 'memory_total_mb', 'total_mb', 'memoryTotalMb']);
      return {
        index: pickString(row, ['index', 'id']) ?? String(i),
        name: pickString(row, ['name']) ?? `GPU ${i}`,
        freeGb: pickNumber(row, ['freeGb', 'free_gb', 'vram_free_gb']) ?? (freeMb !== undefined ? freeMb / 1024 : undefined),
        totalGb: pickNumber(row, ['totalGb', 'total_gb', 'vram_total_gb']) ?? (totalMb !== undefined ? totalMb / 1024 : undefined),
      };
    }),
    tensorSplit: Array.isArray(tensorSplit) ? tensorSplit.join(',') : typeof tensorSplit === 'string' ? tensorSplit : undefined,
    order: Array.isArray(order) ? order.join(',') : typeof order === 'string' ? order : undefined,
  };
}

export interface LlamaHelpFlag {
  flag: string;
  aliases: string[];
  takesValue: boolean;
  description: string;
}

/** Задаются полями launch; через extraArgs бэкенд их отклоняет. */
export const FORBIDDEN_EXTRA_FLAGS = new Set([
  '--host',
  '--port',
  '-m',
  '--model',
  '-hf',
  '-hfr',
  '--hf-repo',
  '-hff',
  '--hf-file',
  '-hft',
  '--hf-token',
  '--models-preset',
  '--models-max',
  '--api-key',
]);

export async function getLlamaHelp(): Promise<LlamaHelpFlag[]> {
  const response = await fetchChatApi('/model/llama-help', { method: 'GET' });
  const data = await readJson<unknown>(response);
  const record = asRecord(data);
  const rows = Array.isArray(data) ? data : Array.isArray(record.flags) ? record.flags : Array.isArray(record.options) ? record.options : [];
  return rows
    .map((item): LlamaHelpFlag | null => {
      const row = asRecord(item);
      const names = [
        ...(Array.isArray(row.names) ? row.names : []),
        ...(Array.isArray(row.aliases) ? row.aliases : []),
        row.flag,
        row.name,
        row.long,
        row.short,
      ].filter((name): name is string => typeof name === 'string' && name.startsWith('-'));
      const unique = [...new Set(names)];
      const flag = unique.find((name) => name.startsWith('--')) ?? unique[0];
      if (!flag) return null;
      const takesValue = Boolean(row.takesValue ?? row.takes_value ?? row.hasArg ?? row.has_arg ?? row.argument ?? row.arg ?? row.value);
      return {
        flag,
        aliases: unique.filter((name) => name !== flag),
        takesValue,
        description: pickString(row, ['description', 'help', 'desc']) ?? '',
      };
    })
    .filter((row): row is LlamaHelpFlag => row !== null)
    .filter((row) => ![row.flag, ...row.aliases].some((name) => FORBIDDEN_EXTRA_FLAGS.has(name)));
}

export interface InstallStatus {
  state: string;
  running: boolean;
  progress?: number;
  message?: string;
  path?: string;
  error?: string;
}

export async function getInstallStatus(): Promise<InstallStatus> {
  const response = await fetchChatApi('/model/llama-binaries/install', { method: 'GET' });
  const data = asRecord(await readJson<unknown>(response));
  const row = data.install ? asRecord(data.install) : data.status && typeof data.status === 'object' ? asRecord(data.status) : data;
  const state = pickString(row, ['state', 'status', 'phase']) ?? 'idle';
  const running = Boolean(row.running ?? row.inProgress ?? ['running', 'downloading', 'extracting', 'pending', 'installing'].includes(state));
  const progress = pickNumber(row, ['progress', 'percent']);
  return {
    state,
    running,
    progress: progress !== undefined && progress <= 1 ? progress * 100 : progress,
    message: pickString(row, ['message', 'step']),
    path: pickString(row, ['path', 'binaryPath', 'installedPath']),
    error: pickString(row, ['error']),
  };
}

async function readText(response: Response, keys: string[]): Promise<string> {
  const raw = await response.text();
  if (!response.ok) {
    try {
      const data = asRecord(JSON.parse(raw));
      throw new Error(pickString(data, ['error', 'message']) ?? `${response.status}`);
    } catch (err) {
      if (err instanceof SyntaxError) throw new Error(raw || `${response.status}`);
      throw err;
    }
  }
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data === 'string') return data;
    const row = asRecord(data);
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join('\n');
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return raw;
  }
}

export async function getLlamaLog(lines = 200): Promise<string> {
  const response = await fetchChatApi(`/model/llama-log?lines=${lines}`, { method: 'GET' });
  return readText(response, ['log', 'lines', 'tail', 'text', 'content']);
}

export async function getLlamaMetrics(): Promise<string> {
  const response = await fetchChatApi('/model/llama-metrics', { method: 'GET' });
  return readText(response, ['metrics', 'body', 'text', 'content']);
}

export async function listBinaries(): Promise<{
  current?: string;
  selected?: string;
  binaries?: Array<{ path?: string; name?: string } | string>;
}> {
  const response = await fetchChatApi('/model/llama-binaries', { method: 'GET' });
  return readJson(response);
}

export async function saveBinaryPath(path: string): Promise<void> {
  const response = await fetchChatApi('/model/llama-binaries', {
    method: 'POST',
    body: JSON.stringify({ path }),
  });
  await readJson(response);
}

export async function listReleases(): Promise<Array<{ name?: string; url: string; variant?: string }>> {
  const response = await fetchChatApi('/model/llama-releases', { method: 'GET' });
  const data = await readJson<{ releases?: Array<{ name?: string; url: string; variant?: string }> }>(response);
  return data.releases ?? (Array.isArray(data) ? data : []);
}

export async function installRelease(url: string): Promise<void> {
  const response = await fetchChatApi('/model/llama-binaries/install', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  await readJson(response);
}

export async function saveModelsPreset(body: {
  name: string;
  defaults?: Record<string, unknown>;
  models: Array<{ id: string; path: string; mmproj?: string; contextSize?: number; gpuLayers?: number }>;
}): Promise<string | undefined> {
  const response = await fetchChatApi('/model/models-preset', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = asRecord(await readJson<unknown>(response));
  const nested = data.preset ? asRecord(data.preset) : data;
  return pickString(nested, ['path', 'file', 'modelsPreset']);
}

export function profileNames(extras: LaunchExtras | null): string[] {
  const rows = extras?.profiles ?? [];
  return rows
    .map((row) => (typeof row === 'string' ? row : row.name))
    .filter((name): name is string => Boolean(name));
}
