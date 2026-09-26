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

export function compactLaunch(launch: LlamaLaunch): LlamaLaunch {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(launch)) {
    if (value === undefined || value === '' || value === null) continue;
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

export async function listArtifacts(): Promise<{ models?: string[]; mmproj?: string[]; draft?: string[] }> {
  const response = await fetchChatApi('/model/artifacts', { method: 'GET' });
  return readJson(response);
}

export async function listGpus(): Promise<{ gpus?: unknown[]; tensorSplit?: string }> {
  const response = await fetchChatApi('/model/gpus', { method: 'GET' });
  return readJson(response);
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
}): Promise<void> {
  const response = await fetchChatApi('/model/models-preset', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await readJson(response);
}

export function profileNames(extras: LaunchExtras | null): string[] {
  const rows = extras?.profiles ?? [];
  return rows
    .map((row) => (typeof row === 'string' ? row : row.name))
    .filter((name): name is string => Boolean(name));
}
