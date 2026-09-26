// /home/user/projects/studioxlam/src/services/llamaService.ts
import { getErrorMessage } from '../utils/errorUtils';
import { toApiDocumentationFormat } from '../utils/functionDocumentationFormatter';
import { buildGrammarApiFields, normalizeGrammarTemplateList } from '../utils/grammarUtils';
import { normalizeServerStatusValue } from '../utils/serverStatus';
import { consumeChatStream } from '../utils/streamResponse';
import type { UnknownRecord } from '../types';
import { fetchChatApi, getChatApiBase } from './apiClient';
import {
  appliedLaunchFlags,
  describeLoadError,
  MODEL_LOAD_TIMEOUT_MS,
  ModelLoadError,
  type LoadLaunchOptions,
} from './llamaLaunchService';

/** Use getChatApiBase() for current runtime URL (after /api/config bootstrap). */
export const getAPIBaseUrl = (): string => getChatApiBase();

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

// ========== INTERFACES ==========
export interface ModelInfo {
  id: string;
  name: string;
  file: string;
  type: string;
  size: string;
  sizeBytes?: number;
  rawSize?: number;
  available: boolean;
  active: boolean;
  path: string;
  parameters?: string;
  lastModified?: string;
  description?: string;
  capabilities?: string[];
  recommended?: boolean;
  source?: 'server' | 'local';
  modelKey?: string;
  chatTemplate?: string;
  quantType?: string;
  isInstruct?: boolean;
  supportsTools?: boolean; 
  chatWrapper?: string; 
  lastScanned?: string;
  modelFamily?: string;
}

export interface ServerStatus {
  status: 'online' | 'error' | 'degraded' | 'checking' | 'offline';
  serverReady: boolean;
  activeModel: string | null;
  modelLoaded: boolean;
  timestamp: string;
  sessions?: number | { active: number, maxHistoryMessages: number };
  uptime?: number;
  llamaServer?: {
    port: number;
    healthy: boolean;
    url: string;
  };
  resources?: {
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    }
  };
  modelInfo?: {
    id?: string;
    name?: string;
    file?: string;
    size?: string;
    contextSize?: number;
    gpuLayers?: number;
    supportsTools?: boolean;
    chatTemplate?: string;
  };
  tools?: {
    available?: number;
    supported?: boolean;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  images?: Array<{ name: string; mimeType: string; previewUrl?: string }>;
  timestamp?: string | number;
  generationTime?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  model?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  grammar?: string;
  jsonSchema?: UnknownRecord;
  repeatPenalty?: number;
  stopSequences?: string[];
  tokenBias?: { [key: number]: number | 'never' };
  sessionId?: string;
  chatId?: string;
  history?: Array<{ role: string; content: string }>;
  chatWrapper?: string;
  wrapperOptions?: UnknownRecord;
  stream?: boolean;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  useTools?: boolean;
  enableThinking?: boolean;
  preserveThinking?: boolean;
  mode?: 'auto' | 'thinking' | 'instruct' | 'coding';
  signal?: AbortSignal;
}

export interface ToolDefinition {
  type?: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: UnknownRecord;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; 
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface GenerationResponse {
  success: boolean;
  response: string;
  model: string | null;
  prompt?: string;
  timestamp: string;
  generationTime?: string;
  tokens?: unknown[];
  usedTokens?: number;
  finishReason?: string;
  tool_calls?: ToolCall[];
  requires_followup?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string | null;
  sessionId: string;
  generationTime: string;
  history: ChatMessage[];
  chatWrapper?: string;
  tool_calls?: ToolCall[];
  requires_followup?: boolean;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  finish_reason?: string;
}

export interface ModelControlResponse {
  success: boolean;
  message: string;
  activeModel: string | null;
  model?: ModelInfo;
  previousModel?: string | null;
  details?: UnknownRecord;
  alreadyLoaded?: boolean;
  launchApplied?: string[];
  httpStatus?: number;
  sessions?: { before?: number; restored?: number; dropped?: number; current?: number; preserved?: boolean };
}

export interface EmbeddingResponse {
  success: boolean;
  embedding: number[];
  vectorSize: number;
  generationTime: string;
  warning?: string;
}

export interface EmbeddingCompareResponse {
  success: boolean;
  similarity: number;
  interpretation: string;
  generationTime: string;
  trimmed?: string;
}

export interface RankingResponse {
  success: boolean;
  results: {
    rank: number;
    document: string;
    score: number;
    relevance: string;
  }[];
  generationTime: string;
}

export interface GrammarResponse {
  success: boolean;
  type: string;
  grammar: string;
  rootRuleName?: string;
  stopGenerationTriggers?: string[];
  trimWhitespaceSuffix?: boolean;
}

export interface ModelInsights {
  model?: {
    name?: string;
    size?: string;
    parameters?: string;
    chatTemplate?: string;
    isInstruct?: boolean;
    supportsTools?: boolean;
    capabilities?: string[];
  };
  performance?: {
    contextSize?: number;
    gpuLayers?: number;
    flashAttention?: boolean;
    memoryUsage?: string;
    uptime?: number;
  };
  sessions?: {
    active?: number;
    totalHistoryMessages?: number;
  };
  recommendations?: string[];
  trainContextSize?: number;
  embeddingVectorSize?: number;
  totalLayers?: number;
  modelSize?: number;
  flashAttentionSupported?: boolean;
  hasEncoder?: boolean;
  hasDecoder?: boolean;
  isRecurrent?: boolean;
  supportsRanking?: boolean;
  swaSize?: number;
  warnings?: string[];
  tokens?: {
    sepToken?: number;
    eosToken?: number;
  };
}

export interface ResourceEstimation {
  modelInfo?: {
    id?: string;
    name?: string;
    size?: string;
  };
  parameters?: {
    contextSize?: number;
    gpuLayers?: number;
    batchSize?: number;
    sequences?: number;
  };
  feasibility?: {
    hasEnoughRAM?: boolean;
    hasEnoughVRAM?: boolean;
  };
  system?: {
    availableRAMGB?: string;
    cpuCores?: number | string;
  };
  model: {
    vram: string;
    ram: string;
    gpuLayers: number;
    cpuLayers: number;
  };
  context: {
    vram: string;
    ram: string;
  };
  total: {
    vram: string;
    ram: string;
  };
}

function asApiRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function formatMemoryValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
    return `${value} B`;
  }
  return '—';
}

function normalizeMemoryPair(source: UnknownRecord | null | undefined): { vram: string; ram: string } {
  return {
    vram: formatMemoryValue(source?.vram ?? source?.VRAM ?? source?.gpu),
    ram: formatMemoryValue(source?.ram ?? source?.RAM ?? source?.cpu ?? source?.host),
  };
}

export function normalizeModelInsights(data: unknown): ModelInsights | null {
  const root = asApiRecord(data);
  if (!root) return null;

  const source = asApiRecord(root.insights) ?? root;
  const model = asApiRecord(source.model);
  const performance = asApiRecord(source.performance);
  const sessions = asApiRecord(source.sessions);
  const recommendations = Array.isArray(source.recommendations)
    ? source.recommendations.filter((item): item is string => typeof item === 'string')
    : [];

  if (model || performance || recommendations.length > 0) {
    return {
      model: model
        ? {
            name: model.name != null ? String(model.name) : undefined,
            size: model.size != null ? String(model.size) : undefined,
            parameters: model.parameters != null ? String(model.parameters) : undefined,
            chatTemplate: model.chatTemplate != null ? String(model.chatTemplate) : undefined,
            isInstruct: model.isInstruct != null ? Boolean(model.isInstruct) : undefined,
            supportsTools: model.supportsTools != null ? Boolean(model.supportsTools) : undefined,
            capabilities: Array.isArray(model.capabilities)
              ? model.capabilities.filter((item): item is string => typeof item === 'string')
              : undefined,
          }
        : undefined,
      performance: performance
        ? {
            contextSize: Number(performance.contextSize) || undefined,
            gpuLayers: Number(performance.gpuLayers) || undefined,
            flashAttention:
              performance.flashAttention != null ? Boolean(performance.flashAttention) : undefined,
            memoryUsage:
              performance.memoryUsage != null ? String(performance.memoryUsage) : undefined,
            uptime: Number(performance.uptime) || undefined,
          }
        : undefined,
      sessions: sessions
        ? {
            active: Number(sessions.active) || 0,
            totalHistoryMessages: Number(sessions.totalHistoryMessages) || 0,
          }
        : undefined,
      recommendations,
      trainContextSize: Number(performance?.contextSize) || undefined,
      warnings: recommendations,
      tokens: {},
    };
  }

  if (source.totalLayers != null || source.modelSize != null) {
    return {
      trainContextSize: Number(source.trainContextSize) || undefined,
      embeddingVectorSize: Number(source.embeddingVectorSize) || undefined,
      totalLayers: Number(source.totalLayers) || 0,
      modelSize: Number(source.modelSize) || 0,
      flashAttentionSupported: Boolean(source.flashAttentionSupported),
      hasEncoder: Boolean(source.hasEncoder),
      hasDecoder: Boolean(source.hasDecoder),
      isRecurrent: Boolean(source.isRecurrent),
      supportsRanking: Boolean(source.supportsRanking),
      swaSize: Number(source.swaSize) || undefined,
      warnings: Array.isArray(source.warnings)
        ? source.warnings.filter((item): item is string => typeof item === 'string')
        : [],
      tokens: asApiRecord(source.tokens) as ModelInsights['tokens'],
    };
  }

  return null;
}

export function hasModelInsightsData(insights: ModelInsights | null | undefined): boolean {
  if (!insights) return false;
  return Boolean(
    insights.model?.name ||
    insights.performance ||
    insights.recommendations?.length ||
    insights.totalLayers ||
    insights.modelSize
  );
}

export function normalizeResourceEstimation(data: unknown): ResourceEstimation | null {
  const root = asApiRecord(data);
  if (!root) return null;

  const apiRequirements = asApiRecord(root.requirements);
  if (
    apiRequirements &&
    (apiRequirements.estimatedVRAMGB != null || apiRequirements.estimatedRAMGB != null)
  ) {
    const modelInfo = asApiRecord(root.model);
    const feasibility = asApiRecord(root.feasibility);
    const system = asApiRecord(root.system);
    const gpuLayers = Number(apiRequirements.gpuLayers ?? 0) || 0;
    const contextSize = Number(apiRequirements.contextSize ?? 0) || 0;
    const modelSize = modelInfo?.size != null
      ? String(modelInfo.size)
      : modelInfo?.modelSizeGB != null
        ? `${modelInfo.modelSizeGB} GB`
        : '—';

    return {
      modelInfo: modelInfo
        ? {
            id: modelInfo.id != null ? String(modelInfo.id) : undefined,
            name: modelInfo.name != null ? String(modelInfo.name) : undefined,
            size: modelSize,
          }
        : undefined,
      parameters: {
        contextSize: contextSize || undefined,
        gpuLayers: gpuLayers || undefined,
        batchSize: Number(apiRequirements.batchSize) || undefined,
        sequences: Number(apiRequirements.sequences) || undefined,
      },
      feasibility: feasibility
        ? {
            hasEnoughRAM: Boolean(feasibility.hasEnoughRAM),
            hasEnoughVRAM: Boolean(feasibility.hasEnoughVRAM),
          }
        : undefined,
      system: system
        ? {
            availableRAMGB:
              system.availableRAMGB != null ? String(system.availableRAMGB) : undefined,
            cpuCores:
              typeof system.cpuCores === 'number' || typeof system.cpuCores === 'string'
                ? system.cpuCores
                : undefined,
          }
        : undefined,
      model: {
        vram: modelSize,
        ram: '—',
        gpuLayers,
        cpuLayers: 0,
      },
      context: {
        vram: contextSize ? `${contextSize.toLocaleString()} токенов` : '—',
        ram: '—',
      },
      total: {
        vram: formatMemoryValue(
          apiRequirements.estimatedVRAMGB != null
            ? `${apiRequirements.estimatedVRAMGB} GB`
            : undefined
        ),
        ram: formatMemoryValue(
          apiRequirements.estimatedRAMGB != null
            ? `${apiRequirements.estimatedRAMGB} GB`
            : undefined
        ),
      },
    };
  }

  const candidates = [
    root,
    asApiRecord(root.requirements),
    asApiRecord(root.estimation),
    asApiRecord(root.estimate),
    asApiRecord(root.data),
  ].filter((item): item is UnknownRecord => item !== null);

  for (const candidate of candidates) {
    const modelBlock = asApiRecord(candidate.model);
    const contextBlock = asApiRecord(candidate.context);
    const totalBlock = asApiRecord(candidate.total);

    if (modelBlock && contextBlock && totalBlock) {
      const modelMem = normalizeMemoryPair(modelBlock);
      const contextMem = normalizeMemoryPair(contextBlock);
      const totalMem = normalizeMemoryPair(totalBlock);
      return {
        model: {
          ...modelMem,
          gpuLayers: Number(modelBlock.gpuLayers ?? candidate.gpuLayers ?? 0) || 0,
          cpuLayers: Number(modelBlock.cpuLayers ?? candidate.cpuLayers ?? 0) || 0,
        },
        context: contextMem,
        total: totalMem,
      };
    }

    const memory = asApiRecord(candidate.memory);
    const vram = asApiRecord(memory?.vram);
    const ram = asApiRecord(memory?.ram);
    if (vram && ram && vram.model !== undefined && vram.context !== undefined && vram.total !== undefined) {
      return {
        model: {
          vram: formatMemoryValue(vram.model),
          ram: formatMemoryValue(ram.model),
          gpuLayers: Number(candidate.gpuLayers ?? root.gpuLayers ?? 0) || 0,
          cpuLayers: Number(candidate.cpuLayers ?? root.cpuLayers ?? 0) || 0,
        },
        context: {
          vram: formatMemoryValue(vram.context),
          ram: formatMemoryValue(ram.context),
        },
        total: {
          vram: formatMemoryValue(vram.total),
          ram: formatMemoryValue(ram.total),
        },
      };
    }

    const flatVram = asApiRecord(candidate.vram);
    const flatRam = asApiRecord(candidate.ram);
    if (flatVram?.model !== undefined && flatVram.context !== undefined && flatVram.total !== undefined) {
      return {
        model: {
          vram: formatMemoryValue(flatVram.model),
          ram: formatMemoryValue(flatRam?.model),
          gpuLayers: Number(candidate.gpuLayers ?? 0) || 0,
          cpuLayers: Number(candidate.cpuLayers ?? 0) || 0,
        },
        context: {
          vram: formatMemoryValue(flatVram.context),
          ram: formatMemoryValue(flatRam?.context),
        },
        total: {
          vram: formatMemoryValue(flatVram.total),
          ram: formatMemoryValue(flatRam?.total),
        },
      };
    }
  }

  return null;
}

export function isResourceEstimationComplete(
  estimation: ResourceEstimation | null | undefined
): boolean {
  if (!estimation) return false;
  const hasTotals =
    estimation.total?.vram &&
    estimation.total.vram !== '—' &&
    estimation.total?.ram &&
    estimation.total.ram !== '—';
  if (hasTotals) return true;
  return Boolean(
    estimation.model?.vram &&
    estimation.context?.vram &&
    estimation.total?.vram
  );
}

export interface AutoConfiguration {
  recommended: boolean;
  score: number;
  compatibilityScore: number;
  bonusScore: number;
  gpuLayers: number;
  contextSize: number;
  memory: {
    vram: {
      model: string;
      context: string;
      total: string;
    };
    ram: {
      model: string;
      context: string;
      total: string;
    };
  };
}

export interface ChatWrapperInfo {
  name: string;
  description: string;
  supportsFunctions: boolean;
  supportsSystemMessage: boolean;
  supportsTools?: boolean; 
  requiresModel?: string; 
  available?: boolean; 
  defaultOptions?: UnknownRecord; 
}

export interface ChatSession {
  sessionId: string;
  history: ChatMessage[];
  createdAt: string;
  lastActivity: string;
  chatWrapper: string;
  systemPrompt?: string;
  totalTokens?: number;
}

export interface SystemInfo {
  success?: boolean;
  system: {
    cpuCores: number | string;
    totalMemory: string;
    freeMemory?: string;
    freeDisk?: string;
    gpu?: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  llama: {
    mode?: string;
    gpu?: string;
    port: number;
    host: string;
    contextSize: number;
    buildType?: string;
    supportsGpuOffloading?: boolean;
    cpuMathCores?: number;
    flashAttention?: boolean;
    chatTemplate?: string | null;
    llamaServerAvailable?: boolean;
  } | null;
  model: {
    activeModel: string | null;
    modelLoaded: boolean;
    sessions: number;
    totalModels?: number;
    availableModels?: number;
    toolsSupported?: boolean;
  };
  config?: {
    modelsDir: string;
    contextSize: number;
    threads: number;
    gpuLayers: string | number;
  };
  tools?: {
    supported?: boolean;
  };
}

export interface FunctionDocumentation {
  success: boolean;
  format: string;
  language?: string;
  documentation: string;
  hasFunctions: boolean;
  functionCount: number;
  modelName?: string;
  role?: string;
  error?: string;
}

function parseDocumentationMeta(markdown: string): {
  modelName?: string;
  role?: string;
  functionCount?: number;
} {
  const modelMatch = markdown.match(/Модель:\s*(.+)/i);
  const roleMatch = markdown.match(/Роль:\s*(.+)/i);
  const countMatch = markdown.match(/Всего функций:\s*(\d+)/i);

  return {
    modelName: modelMatch?.[1]?.trim(),
    role: roleMatch?.[1]?.trim(),
    functionCount: countMatch ? Number(countMatch[1]) : undefined,
  };
}

export function normalizeFunctionDocumentationResponse(
  data: unknown,
  format: string
): FunctionDocumentation {
  if (typeof data === 'string' && data.trim()) {
    const meta = parseDocumentationMeta(data);
    return {
      success: true,
      format,
      documentation: data,
      hasFunctions: true,
      functionCount: meta.functionCount ?? 0,
      modelName: meta.modelName,
      role: meta.role,
    };
  }

  const root = asApiRecord(data);
  if (!root) {
    return {
      success: false,
      format,
      documentation: '',
      hasFunctions: false,
      functionCount: 0,
      error: 'Пустой ответ сервера',
    };
  }

  const documentation =
    (typeof root.documentation === 'string' && root.documentation) ||
    (typeof root.functionDocumentation === 'string' && root.functionDocumentation) ||
    (typeof root.content === 'string' && root.content) ||
    (typeof root.doc === 'string' && root.doc) ||
    (typeof root.result === 'string' && root.result) ||
    (typeof root.output === 'string' && root.output) ||
    '';

  const metaFromMarkdown = documentation ? parseDocumentationMeta(documentation) : {};
  const modelField = root.model;
  const modelName =
    typeof modelField === 'string'
      ? modelField
      : typeof asApiRecord(modelField)?.name === 'string'
        ? String(asApiRecord(modelField)?.name)
        : metaFromMarkdown.modelName;
  const role =
    typeof root.role === 'string'
      ? root.role
      : metaFromMarkdown.role;
  const functionCount =
    Number(root.functionCount ?? root.count ?? metaFromMarkdown.functionCount ?? 0) || 0;
  const hasFunctions = Boolean(root.hasFunctions ?? functionCount > 0);
  const responseFormat = typeof root.format === 'string' ? root.format : format;
  const language = typeof root.language === 'string' ? root.language : undefined;

  if (root.success === false) {
    return {
      success: false,
      format: responseFormat,
      language,
      documentation,
      hasFunctions,
      functionCount,
      modelName,
      role,
      error:
        typeof root.error === 'string'
          ? root.error
          : typeof root.message === 'string'
            ? root.message
            : 'Ошибка генерации документации',
    };
  }

  if (!documentation.trim()) {
    return {
      success: false,
      format: responseFormat,
      language,
      documentation: '',
      hasFunctions,
      functionCount,
      modelName,
      role,
      error: 'Сервер не вернул текст документации',
    };
  }

  return {
    success: true,
    format: responseFormat,
    language,
    documentation,
    hasFunctions,
    functionCount,
    modelName,
    role,
  };
}

export interface TokenPredictorOptions {
  predictorType: 'draft' | 'input-lookup';
  draftModel?: string;
  minTokens?: number;
  maxTokens?: number;
  minConfidence?: number;
  patternLength?: {
    min: number;
    max: number;
  };
  predictionLength?: {
    min: number;
    max: number;
  };
}

export interface ApiConfigResponse {
  success: boolean;
  config: UnknownRecord;
  endpoints: UnknownRecord;
  timestamp: string;
  activeModel?: {
    name?: string;
    supportsTools?: boolean;
    chatTemplate?: string;
  };
}

export interface ToolsListResponse {
  success: boolean;
  tools?: ToolDefinition[];
  count?: number;
  supportsToolCalls?: boolean;
  error?: string;
}

export interface ToolExecuteRequest {
  tool_name: string;
  tool_arguments: UnknownRecord;
  tool_call_id?: string;
}

export interface ToolExecuteResponse {
  success: boolean;
  result?: unknown;
  tool_call_id?: string;
  tool_name?: string;
  error?: string;
  timestamp?: string;
}

export interface ChatWithToolsRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  sessionId?: string;
}

export interface ChatWithToolsResponse {
  success: boolean;
  message?: ChatMessage;
  finish_reason?: string;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  sessionId?: string;
  model?: string;
  requires_followup?: boolean;
  error?: string;
}

export interface ChatToolsCycleRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  max_tokens?: number;
  max_iterations?: number;
  sessionId?: string;
}

export interface ChatToolsCycleResponse {
  success: boolean;
  message?: ChatMessage;
  iterations?: number;
  tool_executions?: ToolCallResult[];
  final_iteration?: number;
  max_iterations_reached?: boolean;
  history_length?: number;
  model?: string;
  sessionId?: string;
  usage?: {
    total_tokens?: number;
  };
  error?: string;
}

// ========== CACHE ==========
let cachedModels: ModelInfo[] | null = null;
let cachedStatus: ServerStatus | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 10_000;

const clearCache = () => {
  cachedModels = null;
  cachedStatus = null;
  lastFetchTime = 0;
};

// ========== UTILITIES ==========
const fetchWithTimeout = async (pathOrUrl: string, options: RequestInit = {}, timeout = 60000) => {
  const base = getChatApiBase();
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    const trimmedUrl = pathOrUrl.endsWith('/') && pathOrUrl.length > normalizedBase.length + 1
      ? pathOrUrl.slice(0, -1)
      : pathOrUrl;

    // Chat API absolute URLs must use fetchChatApi (JWT)
    if (trimmedUrl === normalizedBase || trimmedUrl.startsWith(`${normalizedBase}/`)) {
      const relativePath = trimmedUrl.slice(normalizedBase.length) || '/';
      return fetchChatApi(relativePath.startsWith('/') ? relativePath : `/${relativePath}`, options, timeout);
    }

    // Public endpoints outside chat API base (e.g. GET /health on host root)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(trimmedUrl, {
        ...options,
        signal: options.signal ?? controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const path = pathOrUrl.startsWith(base)
    ? pathOrUrl.slice(base.length) || '/'
    : pathOrUrl.startsWith('/')
      ? pathOrUrl
      : `/${pathOrUrl}`;

  return fetchChatApi(path, options, timeout);
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  try {
    if (!text.trim() && response.ok) return {}; 
    return JSON.parse(text);
  } catch {
    console.warn('API returned invalid JSON:', text.substring(0, 100));
    if (text.trim() === 'OK' || text.trim() === '200 OK') {
        return { success: true, message: text.trim() }; 
    }
    throw new Error(`Invalid JSON response: ${text.substring(0, 50)}...`);
  }
};

const handleApiError = async (response: Response, defaultMessage: string) => {
  if (response.ok) {
    return response;
  }

  let apiMessage: string | undefined;
  try {
    const errorData = await safeJson(response.clone());
    if (typeof errorData.error === 'string' && errorData.error.trim()) {
      apiMessage = errorData.error;
    } else if (typeof errorData.message === 'string' && errorData.message.trim()) {
      apiMessage = errorData.message;
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Invalid JSON')) {
      throw new Error(`${defaultMessage}: ${response.status} ${response.statusText} (Non-JSON response)`);
    }
  }

  throw new Error(apiMessage || `${defaultMessage}: ${response.status} ${response.statusText}`);
};

export const detectXLAMModel = (modelName: string): boolean => {
  const xlamPatterns = [
    /xlam/i, /llama.*xlam/i, /-xlam-/i, /xlam-2/i, /large.*action.*model/i
  ];
  return xlamPatterns.some(pattern => pattern.test(modelName));
};

const detectModelCapabilities = (model: UnknownRecord): string[] => {
  const capabilities: string[] = Array.isArray(model.capabilities)
    ? model.capabilities.filter((item): item is string => typeof item === 'string')
    : [];
  const modelName = typeof model.name === 'string' ? model.name : '';
  const supportsTools = Boolean(model.supportsTools) || detectXLAMModel(modelName);
  if (supportsTools && !capabilities.includes('tools')) {
    capabilities.push('tools', 'function-calling');
  }
  if (detectXLAMModel(modelName)) {
    if (!capabilities.includes('128k-context')) capabilities.push('128k-context');
    if (!capabilities.includes('multi-turn')) capabilities.push('multi-turn');
    if (!capabilities.includes('json-mode')) capabilities.push('json-mode');
  }
  return capabilities;
};

// ========== LLAMA API ==========
export const llamaApi = {
  async getApiInfo() {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/`);
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения информации API:', error);
      throw error;
    }
  },

  async getConfig(): Promise<ApiConfigResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/config`);
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения конфигурации:', error);
      throw error;
    }
  },

  async getHealth(): Promise<UnknownRecord> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/health`);
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка проверки здоровья:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },

  /** GET /api/health — public liveness Node API; `/health` на origin фронтенда отдаёт nginx studioxlam, а не бэкенд. */
  async getRootHealth(): Promise<UnknownRecord> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/health`);
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка root health:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },

  /** GET /api/ping */
  async ping(): Promise<{ success?: boolean; pong?: boolean }> {
    try {
      const response = await fetchWithTimeout('/ping');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка ping:', error);
      return { success: false, pong: false };
    }
  },

  /** GET /api/server/health — detailed server + llama health (Auth) */
  async getServerHealth(): Promise<UnknownRecord> {
    try {
      const response = await fetchWithTimeout('/server/health');
      await handleApiError(response, 'Не удалось получить server health');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка server health:', error);
      throw error;
    }
  },

  async getStatus(): Promise<ServerStatus> {
    if (cachedStatus && Date.now() - lastFetchTime < CACHE_TTL) {
      return cachedStatus;
    }

    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/status`);
      const data = await safeJson(response);

      cachedStatus = {
        ...data,
        status: normalizeServerStatusValue(data.status),
        serverReady: Boolean(data.serverReady ?? data.modelLoaded),
        activeModel: data.activeModel ?? null,
        modelLoaded: Boolean(data.modelLoaded),
        timestamp: data.timestamp ?? new Date().toISOString(),
        sessions: data.sessions ?? data.activeSessions ?? 0,
      };
      lastFetchTime = Date.now();
      return cachedStatus as ServerStatus;
    } catch (error) {
      console.error('Ошибка получения статуса:', error);
      return {
        status: 'error',
        serverReady: false,
        activeModel: null,
        modelLoaded: false,
        sessions: 0,
        timestamp: new Date().toISOString(),
      };
    }
  },

  async checkReady(): Promise<{ success: boolean; ready: boolean; activeModel: string | null }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/ready`);
      return await safeJson(response);
    } catch {
      return { success: false, ready: false, activeModel: null };
    }
  },

  async checkLlamaServerHealth(): Promise<{ healthy: boolean; message: string }> {
    const readHealthy = (data: UnknownRecord): boolean => {
      const llama = (data.llamaServer ?? data.llama ?? {}) as UnknownRecord;
      return Boolean(
        llama.healthy ??
        data.healthy ??
        data.ready ??
        data.ok ??
        data.success ??
        data.serverReady ??
        data.modelLoaded
      );
    };

    try {
      const response = await fetchWithTimeout('/server/health', {}, 5000);
      if (response.ok) {
        const data = await safeJson(response) as UnknownRecord;
        const healthy = readHealthy(data);
        const message = typeof data.message === 'string'
          ? data.message
          : healthy
            ? 'Llama-server работает нормально'
            : 'Llama-server не готов';
        return { healthy, message };
      }
    } catch {
      // Remote /server/health unavailable — fall back to /status on the same API host.
    }

    try {
      const response = await fetchWithTimeout('/status', {}, 5000);
      if (!response.ok) {
        return { healthy: false, message: `Llama-server вернул статус: ${response.status}` };
      }
      const data = await safeJson(response) as UnknownRecord;
      const healthy = readHealthy(data);
      return {
        healthy,
        message: healthy ? 'Llama-server работает нормально' : 'Llama-server не готов',
      };
    } catch {
      return { healthy: false, message: 'Llama-server не отвечает' };
    }
  },

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/system/info`);
      await handleApiError(response, 'Не удалось получить системную информацию');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения системной информации:', error);
      throw error;
    }
  },

  async cleanupSessions(maxAgeMinutes = 60): Promise<{ success: boolean; message: string; cleaned: number }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/system/cleanup`, {
        method: 'POST',
        body: JSON.stringify({ maxAgeMinutes }),
      });
      await handleApiError(response, 'Не удалось очистить сессии');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка очистки сессий:', error);
      throw error;
    }
  },

  async getModels(refresh = false): Promise<ModelInfo[]> {
    if (!refresh && cachedModels && Date.now() - lastFetchTime < CACHE_TTL) {
      return cachedModels;
    }

    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/models`);
      await handleApiError(response, 'Не удалось получить список моделей');
      
      const data = await safeJson(response);
      
      if (data.success && Array.isArray(data.models)) {
        const normalizedModels = data.models.map((model: UnknownRecord) => {
          const capabilities = detectModelCapabilities(model);
          return {
            id: model.id || '',
            name: model.name || model.file || 'Unknown Model',
            file: model.file || '',
            type: model.type || 'Unknown',
            size: model.size || 'Unknown',
            sizeBytes: model.rawSize || 0,
            rawSize: model.rawSize || 0,
            available: model.available || false,
            active: model.active || false,
            path: model.path || '',
            parameters: model.parameters || '8B',
            lastModified: model.lastScanned || new Date().toISOString(),
            description: model.description || '',
            capabilities,
            recommended: model.recommended || false,
            source: 'server' as const,
            modelKey: model.id || '',
            chatTemplate: model.chatTemplate,
            quantType: model.quantType,
            isInstruct: model.isInstruct,
            supportsTools: capabilities.includes('tools') || false,
            chatWrapper: model.chatWrapper || 'default'
          };
        });

        cachedModels = normalizedModels;
        lastFetchTime = Date.now();
        return normalizedModels;
      } else {
        throw new Error('Неверный формат ответа от сервера');
      }
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error);
      return [];
    }
  },

  async scanModels(force: boolean = false): Promise<{ success: boolean; message: string; models: ModelInfo[]; total: number }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/models/rescan`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      });
      await handleApiError(response, 'Не удалось пересканировать модели');
      const data = await safeJson(response);
      clearCache();
      return data;
    } catch (error) {
      console.error('Ошибка пересканирования моделей:', error);
      throw error;
    }
  },

  /** POST /api/models/scan — scan models directory (distinct from rescan) */
  async scanModelsDirectory(force: boolean = false): Promise<{ success: boolean; message: string; models?: ModelInfo[]; total?: number }> {
    try {
      const response = await fetchWithTimeout('/models/scan', {
        method: 'POST',
        body: JSON.stringify({ force }),
      });
      await handleApiError(response, 'Не удалось сканировать модели');
      const data = await safeJson(response);
      clearCache();
      return data;
    } catch (error) {
      console.error('Ошибка сканирования моделей:', error);
      throw error;
    }
  },

  async loadModel(
    modelId: string,
    contextSize?: number,
    threads?: number,
    gpuLayers?: number,
    launchOptions?: LoadLaunchOptions
  ): Promise<ModelControlResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/model/load`, {
        method: 'POST',
        body: JSON.stringify({
          modelId,
          contextSize,
          threads,
          gpuLayers,
          ...(launchOptions?.force ? { force: true } : {}),
          ...(launchOptions?.launchProfile ? { launchProfile: launchOptions.launchProfile } : {}),
          ...(launchOptions?.launch && Object.keys(launchOptions.launch).length ? { launch: launchOptions.launch } : {}),
        }),
      }, MODEL_LOAD_TIMEOUT_MS);
      if (!response.ok) {
        const body = await safeJson(response).catch(() => ({}));
        throw new ModelLoadError(describeLoadError(response.status, body), response.status);
      }
      const data = await safeJson(response);
      clearCache();
      
      const models = await this.getModels(true);
      const loadedModel = models.find(m => m.id === modelId);
      
      return {
        success: data.success,
        message: data.message,
        activeModel: data.activeModel ?? data.newModel?.id ?? modelId,
        previousModel: data.previousModel ?? data.oldModel?.id ?? null,
        alreadyLoaded: data.alreadyLoaded === true,
        launchApplied: appliedLaunchFlags(data),
        model: loadedModel || {
          id: modelId,
          name: data.details?.filename || modelId,
          file: data.details?.filename || '',
          type: 'GGUF',
          size: data.details?.size || 'Unknown',
          available: true,
          active: true,
          path: '',
          description: `Context: ${data.details?.contextSize || 'Unknown'}, GPU Layers: ${data.details?.gpuLayers || 'Unknown'}`,
          supportsTools: detectXLAMModel(data.details?.filename || '')
        },
        details: data.details
      };
    } catch (error) {
      console.error('Ошибка загрузки модели:', error);
      throw error;
    }
  },

  async unloadModel(): Promise<ModelControlResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/model/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await handleApiError(response, 'Не удалось выгрузить модель');
      const data = await safeJson(response);
      clearCache();
      return {
        success: data.success,
        message: data.message,
        activeModel: data.activeModel,
        previousModel: data.previousModel || null,
      };
    } catch (error) {
      console.error('Ошибка выгрузки модели:', error);
      throw error;
    }
  },

  /** POST /api/model/swap — hot-swap active model */
  async swapModel(
    modelId: string,
    options?: { preserveSessions?: boolean; validateCompatibility?: boolean }
  ): Promise<ModelControlResponse> {
    try {
      const response = await fetchWithTimeout('/model/swap', {
        method: 'POST',
        body: JSON.stringify({
          modelId,
          preserveSessions: options?.preserveSessions ?? true,
          validateCompatibility: options?.validateCompatibility ?? true,
        }),
      }, MODEL_LOAD_TIMEOUT_MS);
      if (!response.ok) {
        const body = await safeJson(response).catch(() => ({}));
        throw new ModelLoadError(describeLoadError(response.status, body), response.status);
      }
      const data = await safeJson(response);
      clearCache();
      return {
        success: data.success,
        message: data.message,
        activeModel: data.activeModel ?? data.newModel?.id ?? modelId,
        previousModel: data.previousModel ?? data.oldModel?.id ?? null,
        model: data.model,
        details: data.details,
        sessions: data.sessions,
      };
    } catch (error) {
      console.error('Ошибка swap модели:', error);
      throw error;
    }
  },

  /** POST /api/model/unload-with-adapter */
  async unloadModelWithAdapter(): Promise<ModelControlResponse> {
    try {
      const response = await fetchWithTimeout('/model/unload-with-adapter', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await handleApiError(response, 'Не удалось выгрузить модель с адаптером');
      const data = await safeJson(response);
      clearCache();
      return {
        success: data.success,
        message: data.message,
        activeModel: data.activeModel,
        previousModel: data.previousModel ?? null,
      };
    } catch (error) {
      console.error('Ошибка unload-with-adapter:', error);
      throw error;
    }
  },

  /** GET /api/model/compatibility/:modelId? */
  async getModelCompatibility(modelId?: string): Promise<UnknownRecord> {
    try {
      const path = modelId
        ? `/model/compatibility/${encodeURIComponent(modelId)}`
        : '/model/compatibility';
      const response = await fetchWithTimeout(path);
      await handleApiError(response, 'Не удалось проверить совместимость модели');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка compatibility:', error);
      throw error;
    }
  },

  async getModelInfo(): Promise<UnknownRecord> {
    try {
      const status = await this.getStatus();
      const models = await this.getModels();
      const activeModel = models.find(m => m.id === status.activeModel);
      if (activeModel) {
        return { success: true, model: activeModel, status: 'loaded' };
      }
      return { success: false, error: 'Модель не загружена' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getModelInsights(): Promise<{ success: boolean; insights?: ModelInsights; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/model/insights`);
      await handleApiError(response, 'Не удалось получить insights модели');
      const data = await safeJson(response) as UnknownRecord;
      const insights = normalizeModelInsights(data);

      if (insights) {
        return { success: true, insights };
      }

      if (data.success === false) {
        const error = typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
            ? data.message
            : 'Не удалось получить insights модели';
        return { success: false, error };
      }

      return { success: false, error: 'Информация о модели недоступна' };
    } catch (error) {
      console.error('Ошибка получения insights модели:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async estimateResources(options: {
    modelId?: string;
    modelName?: string;
    gpuLayers?: number;
    contextSize?: number;
    batchSize?: number;
    sequences?: number;
  }): Promise<{ success: boolean; requirements?: ResourceEstimation; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/model/estimate-resources`, {
        method: 'POST',
        body: JSON.stringify(options),
      });
      await handleApiError(response, 'Не удалось оценить ресурсы');
      const data = await safeJson(response) as UnknownRecord;
      const requirements = normalizeResourceEstimation(data);

      if (requirements) {
        return { success: true, requirements };
      }

      if (data.success === false) {
        const error = typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
            ? data.message
            : 'Не удалось оценить ресурсы';
        return { success: false, error };
      }

      return {
        success: false,
        error: 'Сервер вернул неожиданный формат оценки ресурсов',
      };
    } catch (error) {
      console.error('Ошибка оценки ресурсов:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async autoConfigure(options: {
    targetGpuLayers?: number | 'auto' | 'max';
    targetContextSize?: number;
    embeddingContext?: boolean;
    flashAttention?: boolean;
  }): Promise<{ success: boolean; configuration?: AutoConfiguration; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/model/auto-configure`, {
        method: 'POST',
        body: JSON.stringify(options),
      });
      await handleApiError(response, 'Не удалось автоматически настроить конфигурацию');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка автоматической конфигурации:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getActiveModel(): Promise<ModelInfo | null> {
    const models = await this.getModels();
    const status = await this.getStatus();
    if (status.activeModel) {
      return models.find(m => m.id === status.activeModel) || null;
    }
    return null;
  },

  async isModelRunning(modelId?: string): Promise<boolean> {
    const status = await this.getStatus();
    if (!status.serverReady || !status.activeModel) return false;
    if (modelId) {
      return status.activeModel === modelId;
    }
    return true;
  },

  async createChatSession(sessionId = 'default', systemPrompt?: string, chatWrapper?: string, wrapperOptions?: UnknownRecord): Promise<{ success: boolean; sessionId: string; message: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/session`, {
        method: 'POST',
        body: JSON.stringify({ sessionId, systemPrompt, chatWrapper, wrapperOptions }),
      });
      await handleApiError(response, 'Не удалось создать сессию');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
      return { success: false, sessionId, message: error instanceof Error ? error.message : String(error) };
    }
  },

  async sendChatMessage(prompt: string, options: GenerationOptions = {}): Promise<ChatResponse> {
    const sessionId = options.sessionId || 'default';
    try {
      const status = await this.getStatus();
      if (!status.modelLoaded) {
        throw new Error('Модель не загружена. Сначала загрузите модель через loadModel().');
      }

      const requestBody = {
        message: prompt.trim(),
        systemPrompt: options.systemPrompt,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream: false,
        ...buildGrammarApiFields({
          grammar: options.grammar,
          jsonSchema: options.jsonSchema,
        }),
      };

      if (!prompt?.trim()) {
        throw new Error('Сообщение не может быть пустым');
      }

      const response = await fetchWithTimeout(`${getChatApiBase()}/chat`, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      await handleApiError(response, 'Не удалось отправить сообщение в чат');
      const data = await safeJson(response);

      if (!data.success) {
        throw new Error(data.error || data.message || 'Неизвестная ошибка сервера');
      }

      return {
        success: true,
        response: data.response || '',
        model: data.model || status.activeModel || null,
        sessionId: data.sessionId || sessionId,
        generationTime: data.generationTime || '—',
        history: data.history || [],
        chatWrapper: data.chatWrapper || 'default',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      let userMessage = 'Не удалось отправить сообщение';
      if (errorMessage.includes('404')) {
        userMessage = 'Эндпоинт чата не найден на сервере (404). Проверьте бэкенд.';
      } else if (errorMessage.includes('413') || errorMessage.includes('Payload Too Large')) {
        userMessage = 'Сообщение слишком длинное. Сократите текст.';
      } else if (errorMessage.includes('Модель не загружена')) {
        userMessage = 'Модель ещё не загружена. Подождите или загрузите её заново.';
      }
      throw new Error(`${userMessage}: ${errorMessage}`);
    }
  },

  // ========== STREAMING CHAT ==========
  async sendChatMessageStream(
    prompt: string,
    options: GenerationOptions = {},
    onChunk: (chunk: string, fullResponseText: string) => void,
    onComplete: (fullResponseText: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const sessionId = options.sessionId || 'default';
    const abortController = new AbortController();

    try {
      const status = await this.getStatus();
      if (!status.modelLoaded) {
        throw new Error('Модель не загружена');
      }

      const response = await fetchChatApi('/chat', {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          message: prompt.trim(),
          systemPrompt: options.systemPrompt,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await consumeChatStream(response, abortController.signal, onChunk, onComplete);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        onComplete('');
      } else {
        onError(error instanceof Error ? error : new Error(getErrorMessage(error)));
      }
    }
  },

  async getChatHistory(sessionId = 'default'): Promise<ChatSession> {
    try {
      const url = `${getChatApiBase()}/chat/history?sessionId=${encodeURIComponent(sessionId)}`;
      const response = await fetchWithTimeout(url, { headers: { 'X-Session-ID': sessionId } });
      
      if (response.status === 404) {
        console.log(`Сессия ${sessionId} не найдена, возвращаем пустую историю`);
        return {
          sessionId,
          history: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          chatWrapper: 'default'
        };
      }
      
      await handleApiError(response, 'Не удалось получить историю');
      const data = await safeJson(response);
      
      if (data.success) {
        return {
          sessionId: data.sessionId,
          history: data.history || [],
          createdAt: data.createdAt || new Date().toISOString(),
          lastActivity: data.lastActivity || new Date().toISOString(),
          chatWrapper: data.chatWrapper || 'default',
          systemPrompt: data.systemPrompt,
          totalTokens: data.totalTokens
        };
      } else {
        throw new Error(data.error || 'Ошибка получения истории');
      }
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      return {
        sessionId,
        history: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        chatWrapper: 'default'
      };
    }
  },

  async clearChatHistory(sessionId = 'default'): Promise<{ success: boolean; sessionId: string; message: string }> {
    try {
      const url = `${getChatApiBase()}/chat/clear?sessionId=${encodeURIComponent(sessionId)}`;
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepSystem: true }),
      });
      await handleApiError(response, 'Не удалось очистить историю');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка очистки истории:', error);
      return { success: false, sessionId, message: error instanceof Error ? error.message : String(error) };
    }
  },

  async chatWithWrapper(prompt: string, options: {
    wrapper?: string;
    wrapperOptions?: UnknownRecord;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    sessionId?: string;
  }): Promise<ChatResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/with-wrapper`, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          wrapper: options.wrapper,
          wrapperOptions: options.wrapperOptions,
          systemPrompt: options.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          sessionId: options.sessionId || 'default',
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        throw new Error(`Не удалось отправить сообщение с wrapper: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await safeJson(response);
      
      return {
        success: data.success,
        response: data.response,
        model: data.model || null,
        sessionId: data.sessionId || options.sessionId || 'default',
        generationTime: data.generationTime,
        history: data.history || [],
        chatWrapper: data.wrapper,
      };
    } catch (error) {
      console.error('❌ Ошибка чата с wrapper:', error);
      throw error;
    }
  },

  // ========== TOOLS ==========
  async getToolsList(): Promise<ToolsListResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/tools`);
      await handleApiError(response, 'Не удалось получить список инструментов');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения инструментов:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async executeTool(request: ToolExecuteRequest): Promise<ToolExecuteResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/tools/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      await handleApiError(response, 'Не удалось выполнить инструмент');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка выполнения инструмента:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async chatWithTools(request: ChatWithToolsRequest): Promise<ChatWithToolsResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/with-tools`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      await handleApiError(response, 'Не удалось отправить сообщение с инструментами');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка чата с инструментами:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async chatToolsCycle(request: ChatToolsCycleRequest): Promise<ChatToolsCycleResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/tools/cycle`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      await handleApiError(response, 'Не удалось выполнить цикл инструментов');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка выполнения цикла инструментов:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async sendToolResult(toolCallId: string, result: unknown, sessionId = 'default'): Promise<ChatResponse> {
    try {
      const toolMessage: ChatMessage = {
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCallId,
      };
      
      const history = await this.getChatHistory(sessionId);
      history.history.push(toolMessage);
      
      const response = await this.chatWithTools({ messages: history.history, sessionId });
      
      return {
        success: response.success,
        response: response.message?.content || '',
        model: response.model || null,
        sessionId: response.sessionId || sessionId,
        generationTime: `${response.usage?.total_tokens || 0} tokens`,
        history: history.history,
        tool_calls: response.message?.tool_calls,
        requires_followup: response.requires_followup,
        usage: response.usage,
        finish_reason: response.finish_reason
      };
    } catch (error: unknown) {
      console.error('Ошибка отправки результата инструмента:', error);
      throw new Error(`Не удалось отправить результат инструмента: ${getErrorMessage(error)}`);
    }
  },

  async testChatWrapper(options: {
    wrapper?: string;
    wrapperOptions?: UnknownRecord;
    history?: ChatMessage[];
    systemPrompt?: string;
  }): Promise<UnknownRecord> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/wrapper/test`, {
        method: 'POST',
        body: JSON.stringify(options),
      });
      await handleApiError(response, 'Не удалось протестировать wrapper');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка тестирования wrapper:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async generateCompletion(prompt: string, options: GenerationOptions = {}): Promise<GenerationResponse> {
    try {
      const status = await this.getStatus();
      if (!status.modelLoaded) {
        throw new Error('Модель не загружена. Загрузите модель сначала.');
      }

      // /api/completion всегда non-stream (Node → llama stream:false). Для стрима — POST /api/chat stream:true.
      const response = await fetchWithTimeout(
        `${getChatApiBase()}/completion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            stream: false,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            topP: options.topP,
            topK: options.topK,
            repetitionPenalty: options.repeatPenalty,
            ...buildGrammarApiFields({
              grammar: options.grammar,
              jsonSchema: options.jsonSchema,
            }),
          }),
          signal: options.signal,
        },
        600_000
      );
      await handleApiError(response, 'Не удалось сгенерировать текст');
      
      const data = await safeJson(response);
      return {
        success: data.success,
        response: data.completion || data.response,
        model: status.activeModel,
        prompt,
        timestamp: new Date().toISOString(),
        generationTime: data.generationTime,
        usedTokens: data.usedTokens,
      };
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('Ошибка генерации:', error);
      }
      throw error;
    }
  },

  async generateWithPredictor(prompt: string, options: {
    predictorType: string;
    predictorOptions?: UnknownRecord;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  }): Promise<UnknownRecord> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/completion/with-predictor`, {
        method: 'POST',
        body: JSON.stringify({ prompt, ...options }),
      });
      await handleApiError(response, 'Не удалось сгенерировать с predictor');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка генерации с predictor:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getEmbedding(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/embedding`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }, 30000); 
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      const data = await safeJson(response);
      
      if (!data.success) {
        throw new Error(data.error || 'Ошибка при создании embedding');
      }
      
      return {
        success: data.success,
        embedding: data.embedding,
        vectorSize: data.vectorSize,
        generationTime: data.generationTime,
        warning: data.warning,
      };
    } catch (error) {
      console.error('Ошибка получения эмбеддинга:', error);
      throw error;
    }
  },

  async compareEmbeddings(text1: string, text2: string): Promise<EmbeddingCompareResponse> {
    try {
      const MAX_LEN = 20000;
      const trimmed1 = text1.slice(0, MAX_LEN);
      const trimmed2 = text2.slice(0, MAX_LEN);

      const response = await fetchWithTimeout(`${getChatApiBase()}/embedding/compare`, {
        method: 'POST',
        body: JSON.stringify({ text1: trimmed1, text2: trimmed2 }),
      });
      await handleApiError(response, 'Не удалось сравнить embedding');
      
      const data = await safeJson(response);
      return {
        success: data.success,
        similarity: data.similarity,
        interpretation: data.interpretation,
        generationTime: data.generationTime,
        trimmed: data.trimmed,
      };
    } catch (error) {
      console.error('Ошибка сравнения embedding:', error);
      throw error;
    }
  },

  async rankDocuments(query: string, documents: string[]): Promise<RankingResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/ranking`, {
        method: 'POST',
        body: JSON.stringify({ query, documents }),
      });
      await handleApiError(response, 'Не удалось выполнить ранжирование');
      
      const data = await safeJson(response);
      return {
        success: data.success,
        results: data.results,
        generationTime: data.generationTime,
      };
    } catch (error) {
      console.error('Ошибка ранжирования:', error);
      throw error;
    }
  },

  async listGrammarTemplates(): Promise<{ success: boolean; templates: string[]; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/grammar`);
      await handleApiError(response, 'Не удалось получить список грамматик');
      const data = await safeJson(response);
      const templates = normalizeGrammarTemplateList(data);
      return { success: true, templates };
    } catch (error) {
      console.error('Ошибка получения списка грамматик:', error);
      return {
        success: false,
        templates: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async getGrammar(type: string): Promise<GrammarResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/grammar/${encodeURIComponent(type)}`);
      await handleApiError(response, `Грамматика «${type}» не найдена`);
      const data = await safeJson(response);
      if (data && typeof data === 'object') {
        return {
          success: data.success !== false,
          type: typeof data.type === 'string' ? data.type : type,
          grammar: typeof data.grammar === 'string' ? data.grammar : '',
          rootRuleName: typeof data.rootRuleName === 'string' ? data.rootRuleName : undefined,
          stopGenerationTriggers: Array.isArray(data.stopGenerationTriggers)
            ? data.stopGenerationTriggers.filter((item: unknown): item is string => typeof item === 'string')
            : undefined,
          trimWhitespaceSuffix:
            typeof data.trimWhitespaceSuffix === 'boolean' ? data.trimWhitespaceSuffix : undefined,
        };
      }
      throw new Error('Некорректный ответ сервера');
    } catch (error) {
      console.error('Ошибка получения грамматики:', error);
      throw error;
    }
  },

  async createJsonSchemaGrammar(schema: UnknownRecord): Promise<GrammarResponse> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/grammar/json-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });
      await handleApiError(response, 'Не удалось создать грамматику JSON Schema');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка создания JSON Schema грамматики:', error);
      throw error;
    }
  },

  async setTokenBias(tokens: number[], bias: number | 'never'): Promise<{ success: boolean; message: string; bias: number | 'never' }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/token-bias`, {
        method: 'POST',
        body: JSON.stringify({ tokens, bias }),
      });
      await handleApiError(response, 'Не удалось установить token bias');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка установки token bias:', error);
      throw error;
    }
  },

  async getChatWrappers(): Promise<{ success: boolean; wrappers?: ChatWrapperInfo[]; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/wrappers`);
      await handleApiError(response, 'Не удалось получить список wrapper');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения список wrapper:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getChatWrapperInfo(wrapper: string): Promise<{ success: boolean; wrapper?: ChatWrapperInfo; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/wrapper/info?wrapper=${encodeURIComponent(wrapper)}`);
      await handleApiError(response, 'Не удалось получить информацию о wrapper');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения информации о wrapper:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async getAllChatWrappers(): Promise<{ success: boolean; wrappers?: ChatWrapperInfo[]; error?: string }> {
    try {
      const response = await fetchWithTimeout(`${getChatApiBase()}/chat/wrappers/all`);
      await handleApiError(response, 'Не удалось получить все wrapper');
      return await safeJson(response);
    } catch (error) {
      console.error('Ошибка получения всех wrapper:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async generateFunctionDocumentation(
    functions?: unknown,
    format = 'markdown',
    documentParameters = true
  ): Promise<FunctionDocumentation> {
    try {
      const apiFormat = toApiDocumentationFormat(format);
      const body: Record<string, unknown> = {
        format: apiFormat,
        documentParameters,
      };

      if (functions !== undefined && functions !== null) {
        const functionList = Array.isArray(functions) ? functions : [functions];
        if (functionList.length > 0) {
          body.functions = functions;
        }
      }

      const response = await fetchWithTimeout(`${getChatApiBase()}/functions/documentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await handleApiError(response, 'Не удалось сгенерировать документацию функций');
      const text = await response.text();
      let data: unknown = text;
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          // Сервер может вернуть чистый markdown/text вместо JSON.
          data = text;
        }
      } else {
        data = {};
      }
      return normalizeFunctionDocumentationResponse(data, apiFormat);
    } catch (error) {
      console.error('Ошибка генерации документации функций:', error);
      throw error;
    }
  },

  async testModel(modelId: string): Promise<UnknownRecord> {
    try {
      const loadResult = await this.loadModel(modelId);
      if (!loadResult.success) {
        return { success: false, error: `Не удалось загрузить модель: ${loadResult.message}`, modelId };
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const testResponse = await this.generateCompletion('Привет! Напиши короткое приветствие.', {
        temperature: 0.7,
        maxTokens: 50,
      });

      return {
        success: testResponse.success,
        modelId,
        prompt: 'Привет! Напиши короткое приветствие.',
        response: testResponse.response,
        model: testResponse.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), modelId };
    }
  },

  clearCache,
};

export const getModelCapabilities = (model: ModelInfo): string[] => {
  const capabilities: string[] = model.capabilities || [];
  if (detectXLAMModel(model.name) || model.supportsTools) {
    if (!capabilities.includes('tools')) capabilities.push('tools');
    if (!capabilities.includes('function-calling')) capabilities.push('function-calling');
    if (!capabilities.includes('128k-context')) capabilities.push('128k-context');
    if (!capabilities.includes('multi-turn')) capabilities.push('multi-turn');
    if (!capabilities.includes('json-mode')) capabilities.push('json-mode');
  }
  return capabilities;
};

export const getAvailableModels = () => llamaApi.getModels();
export const getAllModels = () => llamaApi.getModels();
export const checkServerHealth = () => llamaApi.getHealth();
export const simulateAgentThought = (prompt: string) => 
  llamaApi.generateCompletion(prompt).then(res => res.response);

export const generate = llamaApi.generateCompletion;
export const chat = llamaApi.sendChatMessage;
export const startModel = llamaApi.loadModel;
export const stopModel = llamaApi.unloadModel;
export const switchModel = llamaApi.loadModel;

export default llamaApi;