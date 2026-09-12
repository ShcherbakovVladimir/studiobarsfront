// /home/user/projects/studioxlam/src/services/agentService.ts

import llamaApi, { 
  ChatMessage, 
  GenerationOptions,
  ModelInfo,
  ServerStatus,
  ModelControlResponse,
  GenerationResponse,
  ChatResponse,
  EmbeddingResponse,
  EmbeddingCompareResponse,
  RankingResponse,
  GrammarResponse,
  ModelInsights,
  ResourceEstimation,
  AutoConfiguration,
  ChatWrapperInfo,
  ChatSession,
  SystemInfo,
  FunctionDocumentation,
  TokenPredictorOptions,
  normalizeFunctionDocumentationResponse,
} from './llamaService';
import { api, fetchChatApi, getToken } from './apiClient';

// Импортируем adapterService
import adapterService from './adapterService';
import { getErrorMessage } from '../utils/errorUtils';
import { canExecuteToolForRole, filterToolsForRole } from '../utils/auth';
import { buildGrammarApiFields } from '../utils/grammarUtils';
import { isServerOnline } from '../utils/serverStatus';
import { consumeChatStream } from '../utils/streamResponse';
import { registerActiveStream } from '../utils/activeStreams';
import { stripThinkingTags } from '../utils/thinkingContent';
import { filesToVisionPayloads } from '../utils/chatVision';
import type { UnknownRecord, XLAMModel } from '../types';

// ========== КОНСТАНТЫ ==========
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;
const STREAM_TIMEOUT_MS = 600000;

// Формирование заголовков для запросов (JWT Bearer)
function getHeaders(sessionId?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  return headers;
}

function getStreamHeaders(sessionId?: string): HeadersInit {
  return {
    ...getHeaders(sessionId),
    Accept: 'text/event-stream',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
  };
}

// ========== ИНТЕРФЕЙСЫ ==========

export interface XlamToolDefinition {
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

export interface XlamToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface XlamToolCallMessage {
  role: 'assistant' | 'tool';
  content?: string;
  tool_calls?: XlamToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface XlamAgentResponse {
  success: boolean;
  response: string;
  model: string | null;
  rawMessages?: ChatMessage[];
  tool_calls?: XlamToolCall[];
  tool_results?: Array<{
    tool_call_id: string;
    name: string;
    content: string;
  }>;
  error?: string;
  metadata?: {
    generationTime?: string;
    tokensUsed?: number;
    finishReason?: string;
    requires_tool_execution?: boolean;
    iterations?: number;
    max_iterations_reached?: boolean;
    mode?: string;
    enableThinking?: boolean;
    preserveThinking?: boolean;
  };
}

export interface ModelControlResponseEx extends Omit<ModelControlResponse, 'previousModel'> {
  previousModel?: string | null;
}

export interface GrammarResponseEx {
  success: boolean;
  grammar?: string;
  error?: string;
  type?: string;
}

export interface FunctionDocumentationEx {
  success: boolean;
  documentation?: string;
  error?: string;
  format?: string;
  language?: string;
  functionCount?: number;
  modelName?: string;
  role?: string;
}

export interface SystemInfoEx {
  success: boolean;
  info?: SystemInfo;
  error?: string;
}

export interface XlamOptions {
  messages?: ChatMessage[];
  tools?: XlamToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  sessionId?: string;
  chatId?: string;
  history?: Array<{ role: string; content: string }>;
  max_iterations?: number;
  systemPrompt?: string;
  enableThinking?: boolean;
  preserveThinking?: boolean;
  mode?: 'thinking' | 'instruct' | 'coding';
  topP?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  topK?: number;
  grammar?: string;
  jsonSchema?: UnknownRecord;
  signal?: AbortSignal;
}

export interface UIToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface UITool {
  name: string;
  description: string;
  parameters: UIToolParameter[];
}

// Streaming callback types
export type StreamChunkCallback = (chunk: string, fullResponse: string) => void;
export type StreamCompleteCallback = (fullResponse: string) => void;
export type StreamErrorCallback = (error: Error) => void;

function createStreamAbort(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', onExternalAbort);
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, STREAM_TIMEOUT_MS);

  const unregister = registerActiveStream(() => {
    if (!controller.signal.aborted) controller.abort();
  });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      unregister();
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function formatChatApiError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as { code?: string; error?: string; message?: string };
    if (json.code === 'VISION_UNAVAILABLE') {
      return 'Модель не поддерживает изображения (vision / mmproj не загружен).';
    }
    if (json.code === 'IMAGES_REQUIRED') {
      return 'Прикрепите хотя бы одно изображение.';
    }
    return json.error || json.message || body || `HTTP ${status}`;
  } catch {
    return body || `HTTP ${status}`;
  }
}

export async function getVisionStatus(): Promise<boolean> {
  try {
    const response = await fetchChatApi('/chat/vision/status', { method: 'GET' }, 15_000);
    if (!response.ok) return false;
    const data = (await response.json()) as { vision?: boolean };
    return data.vision === true;
  } catch {
    return false;
  }
}

// ========== LOCAL TOOLS IMPLEMENTATION ==========

type LocalToolResult = { result?: string; error?: string };
type LocalToolArgs = UnknownRecord;

const localTools: Record<string, (args: LocalToolArgs) => Promise<LocalToolResult>> = {
  get_weather: async (args: LocalToolArgs) => {
    try {
      const location = typeof args.location === 'string' ? args.location : 'London';
      const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
      if (response.ok) {
        const text = await response.text();
        return { result: text.trim() };
      }
      return { error: `Failed to get weather for ${location}` };
    } catch (e) {
      return { error: String(e) };
    }
  },
  
  calculate: async (args: LocalToolArgs) => {
    try {
      const expr = typeof args.expression === 'string' ? args.expression : '';
      if (/[^0-9+\-*/().\s]/.test(expr)) {
        return { error: "Invalid characters in expression. Only numbers and basic operators allowed." };
      }
      const res = new Function(`return ${expr}`)();
      return { result: String(res) };
    } catch (e) {
      return { error: String(e) };
    }
  },
  
  get_time: async (args: LocalToolArgs) => {
    try {
      const timezone = typeof args.timezone === 'string' ? args.timezone : 'UTC';
      const time = new Date().toLocaleString('en-US', { 
        timeZone: timezone,
        dateStyle: 'full', 
        timeStyle: 'long' 
      });
      return { result: time };
    } catch (e) {
      return { error: String(e) };
    }
  },
  
  search_web: async (args: LocalToolArgs) => {
    const query = typeof args.query === 'string' ? args.query : '';
    return { 
      result: `[Simulated Search Result] Information found for "${query}": This is a simulated search result as real web search requires backend configuration.` 
    };
  },
  
  create_bitrix24_lead: async (args: LocalToolArgs) => {
    try {
      const { title, name, last_name, phone } = args as { title?: string; name?: string; last_name?: string; phone?: string };
      console.log('CRM Integration: Creating Bitrix24 lead...', args);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return { 
        result: `Лид успешно создан в Bitrix24. ID: ${Math.floor(Math.random() * 10000)}. Данные: [Название: ${title}, Контакт: ${name || ''} ${last_name || ''}, Тел: ${phone || 'не указан'}]` 
      };
    } catch (e) {
      return { error: `Ошибка при создании лида: ${String(e)}` };
    }
  }
};

// ========== STREAMING CHAT FUNCTION ==========

export async function chatStream(
  prompt: string,
  options: GenerationOptions = {},
  onChunk: StreamChunkCallback,
  onComplete?: StreamCompleteCallback,
  onError?: StreamErrorCallback
): Promise<void> {
  const abort = createStreamAbort(options.signal);

  try {
    const activeModel = await getActiveModel();
    const isQwen36ModelFlag = isQwen36Model(activeModel);
    
    // Подготовка параметров для Qwen3.6
    let finalOptions = { ...options };
    
    if (isQwen36ModelFlag) {
      const mode = options.mode || 'thinking';
      
      switch (mode) {
        case 'thinking':
          finalOptions = {
            ...finalOptions,
            temperature: options.temperature ?? 1.0,
            topP: options.topP ?? 0.95,
            topK: options.topK ?? 20,
            repeatPenalty: options.repeatPenalty ?? 1.0,
            maxTokens: options.maxTokens ?? 32768,
            enableThinking: true
          };
          break;
        case 'instruct':
          finalOptions = {
            ...finalOptions,
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.80,
            topK: options.topK ?? 20,
            repeatPenalty: options.repeatPenalty ?? 1.5,
            maxTokens: options.maxTokens ?? 8192,
            enableThinking: false
          };
          break;
        case 'coding':
          finalOptions = {
            ...finalOptions,
            temperature: options.temperature ?? 0.6,
            topP: options.topP ?? 0.95,
            topK: options.topK ?? 20,
            repeatPenalty: options.repeatPenalty ?? 1.0,
            maxTokens: options.maxTokens ?? 81920,
            enableThinking: true
          };
          break;
        default:
          finalOptions = {
            ...finalOptions,
            enableThinking: options.enableThinking !== false
          };
      }
      
      console.log(`📤 Qwen3.6 stream request: mode=${mode}, enableThinking=${finalOptions.enableThinking}`);
    }

    if (abort.signal.aborted) {
      return;
    }

    const requestStartedAt = performance.now();
    const response = await fetchChatApi('/chat', {
      method: 'POST',
      headers: getStreamHeaders(options.sessionId),
      body: JSON.stringify({
        message: prompt,
        stream: true,
        temperature: finalOptions.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: finalOptions.maxTokens ?? DEFAULT_MAX_TOKENS,
        topP: finalOptions.topP,
        topK: finalOptions.topK,
        repetitionPenalty: finalOptions.repeatPenalty,
        sessionId: options.sessionId,
        chatId: options.chatId ?? options.sessionId,
        history: options.history,
        system_prompt: options.systemPrompt,
        systemPrompt: options.systemPrompt,
        ...buildGrammarApiFields({
          grammar: finalOptions.grammar,
          jsonSchema: finalOptions.jsonSchema,
        }),
        ...(isQwen36ModelFlag && {
          enableThinking: finalOptions.enableThinking,
          preserveThinking: options.preserveThinking,
          mode: options.mode
        })
      }),
      signal: abort.signal,
    }, STREAM_TIMEOUT_MS);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(formatChatApiError(response.status, errorText));
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    await consumeChatStream(response, abort.signal, onChunk, onComplete, {
      requestStartedAt,
      label: 'chat-stream',
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      if (abort.didTimeout()) {
        onError?.(new Error('Таймаут генерации ответа (10 минут)'));
      }
      return;
    }
    console.error('Stream chat error:', error);
    onError?.(error instanceof Error ? error : new Error(getErrorMessage(error)));
  } finally {
    abort.cleanup();
  }
}

export async function chatStreamVision(
  prompt: string,
  files: File[],
  options: GenerationOptions = {},
  onChunk: StreamChunkCallback,
  onComplete?: StreamCompleteCallback,
  onError?: StreamErrorCallback
): Promise<void> {
  const abort = createStreamAbort(options.signal);

  try {
    if (files.length === 0) {
      throw new Error('Прикрепите хотя бы одно изображение.');
    }

    const images = await filesToVisionPayloads(files);
    if (abort.signal.aborted) return;

    const requestStartedAt = performance.now();
    const response = await fetchChatApi('/chat/vision', {
      method: 'POST',
      headers: getStreamHeaders(options.sessionId),
      body: JSON.stringify({
        message: prompt,
        images,
        stream: true,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        topP: options.topP,
        topK: options.topK,
        repetitionPenalty: options.repeatPenalty,
        sessionId: options.sessionId,
        chatId: options.chatId ?? options.sessionId,
        history: options.history ?? [],
        system_prompt: options.systemPrompt,
        systemPrompt: options.systemPrompt,
      }),
      signal: abort.signal,
    }, STREAM_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(formatChatApiError(response.status, errorText));
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    await consumeChatStream(response, abort.signal, onChunk, onComplete, {
      requestStartedAt,
      label: 'chat-vision-stream',
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      if (abort.didTimeout()) {
        onError?.(new Error('Таймаут генерации ответа (10 минут)'));
      }
      return;
    }
    console.error('Vision stream error:', error);
    onError?.(error instanceof Error ? error : new Error(getErrorMessage(error)));
  } finally {
    abort.cleanup();
  }
}

// ========== STREAMING CHAT WITH TOOLS ==========

export async function chatStreamWithTools(
  prompt: string,
  options: XlamOptions = {},
  onChunk: StreamChunkCallback,
  onComplete?: StreamCompleteCallback,
  onError?: StreamErrorCallback
): Promise<void> {
  const abort = createStreamAbort(options.signal);

  try {
    const activeModel = await getActiveModel();
    const isQwen36ModelFlag = activeModel && isQwen36Model(activeModel);
    
    if (activeModel && !activeModel.supportsTools && options.tools && options.tools.length > 0) {
      if (onError) onError(new Error(`Модель ${activeModel.name} не поддерживает инструменты`));
      return;
    }
    
    let finalOptions = { ...options };
    
    if (isQwen36ModelFlag && options.mode) {
      const qwenOpts = getQwen36Options(options.mode);
      finalOptions = {
        ...finalOptions,
        temperature: options.temperature ?? qwenOpts.temperature,
        maxTokens: options.maxTokens ?? qwenOpts.maxTokens,
        topP: options.topP ?? qwenOpts.topP,
        topK: options.topK ?? qwenOpts.topK,
        repetitionPenalty: options.repetitionPenalty ?? qwenOpts.repeatPenalty,
        enableThinking: options.enableThinking ?? qwenOpts.enableThinking
      };
    }

    if (abort.signal.aborted) {
      return;
    }

    const requestStartedAt = performance.now();
    const response = await fetchChatApi('/chat/with-tools', {
      method: 'POST',
      headers: getStreamHeaders(options.sessionId),
      body: JSON.stringify({
        message: prompt,
        messages: [{ role: 'user', content: prompt }],
        tools: options.tools ? filterToolsForRole(options.tools) : options.tools,
        temperature: finalOptions.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: finalOptions.maxTokens ?? DEFAULT_MAX_TOKENS,
        maxTokens: finalOptions.maxTokens ?? DEFAULT_MAX_TOKENS,
        topP: finalOptions.topP,
        topK: finalOptions.topK,
        repetitionPenalty: finalOptions.repetitionPenalty,
        tool_choice: options.tool_choice || 'auto',
        sessionId: options.sessionId,
        chatId: options.chatId ?? options.sessionId,
        history: options.history,
        system_prompt: options.systemPrompt,
        systemPrompt: options.systemPrompt,
        ...buildGrammarApiFields({
          grammar: finalOptions.grammar,
          jsonSchema: finalOptions.jsonSchema,
        }),
        ...(isQwen36ModelFlag && {
          enableThinking: finalOptions.enableThinking,
          preserveThinking: options.preserveThinking,
          mode: options.mode
        }),
        stream: true
      }),
      signal: abort.signal,
    }, STREAM_TIMEOUT_MS);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    await consumeChatStream(response, abort.signal, onChunk, onComplete, {
      requestStartedAt,
      label: 'chat-stream+tools',
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      if (abort.didTimeout()) {
        onError?.(new Error('Таймаут генерации ответа (10 минут)'));
      }
      return;
    }
    console.error('Stream chat with tools error:', error);
    onError?.(error instanceof Error ? error : new Error(getErrorMessage(error)));
  } finally {
    abort.cleanup();
  }
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

export async function getApiInfo() {
  try {
    return await llamaApi.getApiInfo();
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Не удалось получить информацию об API'
    };
  }
}

export async function getConfig() {
  try {
    return await llamaApi.getConfig();
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Не удалось получить конфигурацию'
    };
  }
}

export async function checkHealth() {
  try {
    return await llamaApi.getHealth();
  } catch (error: unknown) {
    return {
      status: 'error',
      message: getErrorMessage(error) || 'Ошибка проверки здоровья',
      timestamp: new Date().toISOString()
    };
  }
}

export async function getRootHealth() {
  try {
    return await llamaApi.getRootHealth();
  } catch (error: unknown) {
    return {
      status: 'error',
      message: getErrorMessage(error) || 'Ошибка root health',
      timestamp: new Date().toISOString()
    };
  }
}

export async function ping() {
  try {
    return await llamaApi.ping();
  } catch (error: unknown) {
    return { success: false, pong: false, error: getErrorMessage(error) };
  }
}

export async function getDetailedServerHealth() {
  try {
    return await llamaApi.getServerHealth();
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка server health'
    };
  }
}

export async function getServerStatus(): Promise<ServerStatus> {
  try {
    return await llamaApi.getStatus();
  } catch {
    return {
      status: 'error',
      serverReady: false,
      activeModel: null,
      modelLoaded: false,
      timestamp: new Date().toISOString(),
      sessions: 0
    };
  }
}

export async function getModels(refresh = false): Promise<ModelInfo[]> {
  try {
    return await llamaApi.getModels(refresh);
  } catch (error: unknown) {
    console.error('Error getting models:', error);
    return [];
  }
}

export async function scanModels(force: boolean = false) {
  try {
    return await llamaApi.scanModels(force);
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка сканирования моделей',
      models: [],
      total: 0
    };
  }
}

export async function scanModelsDirectory(force: boolean = false) {
  try {
    return await llamaApi.scanModelsDirectory(force);
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка сканирования директории моделей',
      models: [],
      total: 0
    };
  }
}

export async function startModel(
  modelId: string, 
  contextSize?: number, 
  threads?: number, 
  gpuLayers?: number
): Promise<ModelControlResponseEx> {
  try {
    const response = await llamaApi.loadModel(modelId, contextSize, threads, gpuLayers);
    return {
      success: response.success,
      message: response.message,
      activeModel: response.activeModel,
      previousModel: response.previousModel || null,
      model: response.model
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка загрузки модели',
      activeModel: null,
      previousModel: null
    };
  }
}

export async function stopModel(): Promise<ModelControlResponseEx> {
  try {
    const response = await llamaApi.unloadModel();
    return {
      success: response.success,
      message: response.message,
      activeModel: response.activeModel,
      previousModel: response.previousModel || null,
      model: response.model
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка выгрузки модели',
      activeModel: null,
      previousModel: null
    };
  }
}

export async function switchModel(
  modelId: string, 
  contextSize?: number, 
  threads?: number, 
  gpuLayers?: number
): Promise<ModelControlResponseEx> {
  try {
    const response = await llamaApi.swapModel(modelId, { contextSize, threads, gpuLayers });
    return {
      success: response.success,
      message: response.message,
      activeModel: response.activeModel,
      previousModel: response.previousModel || null,
      model: response.model
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка переключения модели',
      activeModel: null,
      previousModel: null
    };
  }
}

export async function unloadModelWithAdapter(): Promise<ModelControlResponseEx> {
  try {
    const response = await llamaApi.unloadModelWithAdapter();
    return {
      success: response.success,
      message: response.message,
      activeModel: response.activeModel,
      previousModel: response.previousModel || null
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error) || 'Ошибка выгрузки модели с адаптером',
      activeModel: null,
      previousModel: null
    };
  }
}

export async function getModelCompatibility(modelId?: string) {
  try {
    return await llamaApi.getModelCompatibility(modelId);
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка проверки совместимости модели'
    };
  }
}

export async function getModelInfo() {
  try {
    return await llamaApi.getModelInfo();
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка получения информации о модели'
    };
  }
}

export async function getModelInsights(): Promise<{ success: boolean; insights?: ModelInsights; error?: string }> {
  try {
    const response = await llamaApi.getModelInsights();
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка получения insights модели'
    };
  }
}

export async function estimateResources(options: {
  modelId?: string;
  modelName?: string;
  gpuLayers?: number;
  contextSize?: number;
  batchSize?: number;
  sequences?: number;
}): Promise<{ success: boolean; requirements?: ResourceEstimation; error?: string }> {
  try {
    const response = await llamaApi.estimateResources(options);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка оценки ресурсов'
    };
  }
}

export async function autoConfigure(options: {
  targetGpuLayers?: number | 'auto' | 'max';
  targetContextSize?: number;
  embeddingContext?: boolean;
  flashAttention?: boolean;
}): Promise<{ success: boolean; configuration?: AutoConfiguration; error?: string }> {
  try {
    const response = await llamaApi.autoConfigure(options);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка автоматической конфигурации'
    };
  }
}

export async function getActiveModel(): Promise<ModelInfo | null> {
  try {
    return await llamaApi.getActiveModel();
  } catch (error) {
    console.error('Error getting active model:', error);
    return null;
  }
}

export async function isModelRunning(modelId?: string): Promise<boolean> {
  try {
    return await llamaApi.isModelRunning(modelId);
  } catch (error) {
    console.error('Error checking model running:', error);
    return false;
  }
}

export async function createChatSession(
  sessionId = 'default', 
  systemPrompt?: string, 
  chatWrapper?: string, 
  wrapperOptions?: UnknownRecord
) {
  try {
    return await llamaApi.createChatSession(sessionId, systemPrompt, chatWrapper, wrapperOptions);
  } catch (error: unknown) {
    return {
      success: false,
      sessionId,
      message: getErrorMessage(error) || 'Ошибка создания сессии'
    };
  }
}

export async function chatAgent(
  prompt: string, 
  options: GenerationOptions = {}
): Promise<XlamAgentResponse> {
  try {
    const activeModel = await getActiveModel();
    const isQwen36ModelFlag = isQwen36Model(activeModel);
    
    let finalOptions = { ...options };
    
    if (isQwen36ModelFlag) {
      const mode = options.mode || 'thinking';
      
      const qwenDefaults: GenerationOptions = {
        temperature: 0.7,
        topP: 0.95,
        topK: 20,
        repeatPenalty: 1.05,
        enableThinking: true,
        preserveThinking: false
      };
      
      switch (mode) {
        case 'thinking':
          qwenDefaults.temperature = 1.0;
          qwenDefaults.topP = 0.95;
          qwenDefaults.repeatPenalty = 1.0;
          qwenDefaults.enableThinking = true;
          qwenDefaults.maxTokens = options.maxTokens || 32768;
          console.log(`🧠 Qwen3.6 thinking mode: temp=1.0, top_p=0.95`);
          break;
          
        case 'instruct':
          qwenDefaults.temperature = 0.7;
          qwenDefaults.topP = 0.80;
          qwenDefaults.repeatPenalty = 1.5;
          qwenDefaults.enableThinking = false;
          qwenDefaults.maxTokens = options.maxTokens || 8192;
          console.log(`⚡ Qwen3.6 instruct mode: temp=0.7, top_p=0.80, repeat_penalty=1.5`);
          break;
          
        case 'coding':
          qwenDefaults.temperature = 0.6;
          qwenDefaults.topP = 0.95;
          qwenDefaults.repeatPenalty = 1.0;
          qwenDefaults.enableThinking = true;
          qwenDefaults.maxTokens = options.maxTokens || 81920;
          console.log(`💻 Qwen3.6 coding mode: temp=0.6, top_p=0.95, max_tokens increased`);
          break;
          
        default:
          if (!options.temperature) qwenDefaults.temperature = 1.0;
          if (!options.topP) qwenDefaults.topP = 0.95;
          qwenDefaults.enableThinking = options.enableThinking !== false;
          break;
      }
      
      finalOptions = {
        ...qwenDefaults,
        ...options,
        enableThinking: options.enableThinking !== undefined 
          ? options.enableThinking 
          : qwenDefaults.enableThinking,
        preserveThinking: options.preserveThinking !== undefined
          ? options.preserveThinking
          : qwenDefaults.preserveThinking,
        mode: mode
      };
      
      console.log(`📤 Qwen3.6 request: mode=${mode}, enableThinking=${finalOptions.enableThinking}, preserveThinking=${finalOptions.preserveThinking}`);
    } else if (isQwenModel(activeModel)) {
      finalOptions = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        topK: options.topK || 40,
        repeatPenalty: options.repeatPenalty || 1.05,
        enableThinking: false,
        ...options
      };
    }
    
    const response = await llamaApi.sendChatMessage(prompt, finalOptions);
    
    let processedResponse = response.response;
    
    if (isQwen36ModelFlag && !finalOptions.enableThinking) {
      processedResponse = stripThinkingTags(processedResponse);
    }
    
    return {
      success: true,
      response: processedResponse,
      model: response.model,
      rawMessages: response.history,
      metadata: {
        generationTime: response.generationTime,
        mode: finalOptions.mode as string,
        enableThinking: finalOptions.enableThinking,
        preserveThinking: finalOptions.preserveThinking
      }
    };
  } catch (error: unknown) {
    console.error('Chat agent error:', error);
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка отправки сообщения'
    };
  }
}

export async function chatWithWrapper(
  prompt: string, 
  options: {
    wrapper?: string;
    wrapperOptions?: UnknownRecord;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    sessionId?: string;
  }
): Promise<XlamAgentResponse> {
  try {
    const response = await llamaApi.chatWithWrapper(prompt, options);
    return {
      success: true,
      response: response.response,
      model: response.model,
      rawMessages: response.history,
      metadata: {
        generationTime: response.generationTime
      }
    };
  } catch (error: unknown) {
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка чата с wrapper'
    };
  }
}

// ========== СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ РАЗНЫХ ТИПОВ МОДЕЛЕЙ ==========

export async function chatWithSaiga(
  prompt: string,
  options: XlamOptions = {}
): Promise<XlamAgentResponse> {
  try {
    const systemPrompt = options.systemPrompt || "Ты - русскоязычный AI ассистент Saiga. Отвечай на русском языке естественно и развернуто.";
    const response = await llamaApi.sendChatMessage(prompt, {
      ...options,
      systemPrompt
    });
    return {
      success: true,
      response: response.response,
      model: response.model,
      rawMessages: response.history,
      metadata: {
        generationTime: response.generationTime
      }
    };
  } catch (error: unknown) {
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка чата с Saiga моделью'
    };
  }
}

export async function smartChat(
  prompt: string,
  options: XlamOptions = {}
): Promise<XlamAgentResponse> {
  try {
    const activeModel = await getActiveModel();
    const modelFamily = activeModel ? getModelFamilyFromName(activeModel.name) : 'unknown';
    const isQwen36Flag = isQwen36Model(activeModel);
    
    if (isQwen36Flag && options.mode) {
      const qwenOptions = getQwen36Options(options.mode as 'thinking' | 'instruct' | 'coding');
      return await chatAgent(prompt, { 
        temperature: options.temperature ?? qwenOptions.temperature,
        maxTokens: options.maxTokens ?? qwenOptions.maxTokens,
        topP: options.topP ?? qwenOptions.topP,
        topK: options.topK ?? qwenOptions.topK,
        repeatPenalty: options.repetitionPenalty ?? qwenOptions.repeatPenalty,
        enableThinking: options.enableThinking ?? qwenOptions.enableThinking,
        preserveThinking: options.preserveThinking,
        mode: options.mode,
        sessionId: options.sessionId,
        systemPrompt: options.systemPrompt
      });
    }
    
    if (isQwen36Flag && options.enableThinking !== false) {
      return await chatAgent(prompt, { 
        ...options, 
        enableThinking: true,
        temperature: options.temperature || 1.0,
        topP: options.topP || 0.95,
        repeatPenalty: options.repetitionPenalty || 1.0
      });
    }
    
    if (modelFamily === 'saiga') {
      return await chatWithSaiga(prompt, options);
    }
    
    if (activeModel?.supportsTools && options.tools && options.tools.length > 0) {
      return await clientSideToolsLoop(prompt, options);
    }
    
    return await chatAgent(prompt, options);
  } catch (error: unknown) {
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка умного чата'
    };
  }
}

export function convertToUITool(tool: XlamToolDefinition): UITool {
  return {
    name: tool.function.name,
    description: tool.function.description,
    parameters: Object.entries(tool.function.parameters.properties || {}).map(([name, schemaValue]) => {
      const schema = schemaValue as UnknownRecord;
      return {
      name,
      type: typeof schema.type === 'string' ? schema.type : 'string',
      description: typeof schema.description === 'string' ? schema.description : '',
      required: (tool.function.parameters.required || []).includes(name)
    };
    })
  };
}

export async function getAvailableToolsUI(): Promise<{ 
  success: boolean; 
  tools?: UITool[]; 
  error?: string 
}> {
  try {
    const toolsResponse = await getAvailableTools();
    if (!toolsResponse.success || !toolsResponse.tools) {
      return {
        success: false,
        error: toolsResponse.error || 'No tools available'
      };
    }
    
    const uiTools = toolsResponse.tools.map(convertToUITool);
    return {
      success: true,
      tools: uiTools
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Error getting tools for UI'
    };
  }
}

export async function getAvailableTools(): Promise<{ success: boolean; tools?: XlamToolDefinition[]; error?: string }> {
  try {
    const data = await api<{ success: boolean; tools?: XlamToolDefinition[]; error?: string }>('/tools');
    if (data.success && data.tools && data.tools.length > 0) {
      return { ...data, tools: filterToolsForRole(data.tools) };
    }
    return { success: true, tools: filterToolsForRole(DEFAULT_TOOLS) };
  } catch (error: unknown) {
    console.warn('Error getting tools from server, using defaults:', error);
    return {
      success: true,
      tools: filterToolsForRole(DEFAULT_TOOLS),
    };
  }
}

export async function executeTool(
  tool_name: string,
  tool_arguments: UnknownRecord,
  tool_call_id?: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!canExecuteToolForRole(tool_name)) {
    return {
      success: false,
      error: 'Инструмент недоступен для роли employee',
    };
  }
  if (localTools[tool_name]) {
    console.log(`Executing local tool: ${tool_name}`, tool_arguments);
    const output = await localTools[tool_name](tool_arguments);
    if (output.error) {
      return { success: false, error: output.error };
    }
    return { success: true, result: output.result };
  }

  try {
    return await api<{ success: boolean; result?: unknown; error?: string }>('/tools/execute', {
      method: 'POST',
      body: JSON.stringify({
        tool_name,
        tool_arguments,
        tool_call_id,
      }),
    });
  } catch (error: unknown) {
    console.error('Error executing tool:', error);
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка выполнения инструмента'
    };
  }
}

export async function chatWithTools(
  messages: ChatMessage[],
  options: XlamOptions = {}
): Promise<XlamAgentResponse> {
  try {
    const activeModel = await getActiveModel();
    if (activeModel && !activeModel.supportsTools) {
      return {
        success: false,
        response: '',
        model: activeModel.name,
        error: `Модель ${activeModel.name} не поддерживает инструменты.`
      };
    }
    
    const data = await api<{
      success: boolean;
      message?: { content?: string; tool_calls?: XlamToolCall[] };
      response?: string;
      usage?: { total_tokens?: number };
      finish_reason?: string;
    }>('/chat/with-tools', {
      method: 'POST',
      headers: getHeaders(options.sessionId),
      body: JSON.stringify({
        messages,
        tools: options.tools ? filterToolsForRole(options.tools) : options.tools,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 8192,
        model: options.model || 'llama',
        tool_choice: options.tool_choice || 'auto',
        sessionId: options.sessionId || 'xlam-session',
        systemPrompt: options.systemPrompt,
        ...(options.enableThinking !== undefined && { enableThinking: options.enableThinking }),
        ...(options.preserveThinking !== undefined && { preserveThinking: options.preserveThinking }),
        ...(options.mode && { mode: options.mode }),
      }),
    });

    return {
      success: data.success,
      response: data.message?.content || data.response || '',
      model: options.model || 'llama',
      tool_calls: data.message?.tool_calls,
      metadata: {
        generationTime: `${data.usage?.total_tokens || 0} tokens`,
        finishReason: data.finish_reason,
        requires_tool_execution: (data.message?.tool_calls?.length ?? 0) > 0,
      },
    };
  } catch (error: unknown) {
    console.error('Error chatting with tools:', error);
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка чата с инструментами'
    };
  }
}

export async function clientSideToolsLoop(
  initialPrompt: string,
  options: XlamOptions
): Promise<XlamAgentResponse> {
  const messages = [...(options.messages || [])];
  if (messages.length === 0) {
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: initialPrompt });
  } else {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== initialPrompt) {
     messages.push({ role: 'user', content: initialPrompt });
    }
  }
  
  const maxIterations = options.max_iterations || 5;
  let iteration = 0;
  let finalResponse = '';
  
  while (iteration < maxIterations) {
    iteration++;
    console.log(`Tools Loop Iteration: ${iteration}`);
    
    const response = await chatWithTools(messages, options);
    if (!response.success) return response;
    
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.response || '',
      tool_calls: response.tool_calls
    };
    messages.push(assistantMessage);
    finalResponse = response.response;
    
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Tool calls detected:', response.tool_calls);
      for (const toolCall of response.tool_calls) {
        let args = {};
        try {
          args = typeof toolCall.function.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments) 
            : toolCall.function.arguments;
        } catch (e) {
          console.error("Failed to parse tool arguments", e);
        }
        
        const execResult = await executeTool(toolCall.function.name, args, toolCall.id);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(execResult.result || execResult.error || "Error executing tool")
        });
      }
    } else {
      break;
    }
  }
  
  const toolResults = messages
    .filter(m => m.role === 'tool')
    .map(m => ({
      tool_call_id: m.tool_call_id || '',
      name: m.name || '',
      content: m.content
    }));

  return {
    success: true,
    response: finalResponse,
    model: options.model || null,
    rawMessages: messages,
    tool_results: toolResults.length > 0 ? toolResults : undefined,
    metadata: {
        max_iterations_reached: iteration >= maxIterations,
        iterations: iteration
    }
  };
}

export async function chatWithToolsCycle(
  prompt: string,
  options: XlamOptions = {}
): Promise<XlamAgentResponse> {
  return clientSideToolsLoop(prompt, options);
}

export async function chatWithToolsSimple(
  prompt: string,
  options: XlamOptions = {}
): Promise<XlamAgentResponse> {
  const activeModel = await getActiveModel();
  if (activeModel) {
    const modelFamily = getModelFamilyFromName(activeModel.name);
    if (modelFamily === 'saiga') {
      return {
        success: false,
        response: '',
        model: activeModel.name,
        error: 'Saiga модели не поддерживают инструменты. Используйте стандартный чат.'
      };
    }
  }
  return clientSideToolsLoop(prompt, options);
}

// ========== РАБОТА С ИСТОРИЕЙ ЧАТА ==========

export async function getChatHistory(sessionId = 'default'): Promise<ChatSession> {
  try {
    return await llamaApi.getChatHistory(sessionId);
  } catch {
    return {
      sessionId,
      history: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      chatWrapper: 'default'
    };
  }
}

export async function clearChatHistory(sessionId = 'default') {
  try {
    return await llamaApi.clearChatHistory(sessionId);
  } catch (error: unknown) {
    return {
      success: false,
      sessionId,
      message: getErrorMessage(error) || 'Ошибка очистки истории'
    };
  }
}

// ========== ГЕНЕРАЦИЯ ==========

export async function generateCompletion(
  prompt: string, 
  options: GenerationOptions = {}
): Promise<XlamAgentResponse> {
  try {
    const response = await llamaApi.generateCompletion(prompt, options);
    return {
      success: true,
      response: response.response,
      model: response.model,
      metadata: {
        generationTime: response.generationTime,
        tokensUsed: response.usedTokens
      }
    };
  } catch (error: unknown) {
    return {
      success: false,
      response: '',
      model: null,
      error: getErrorMessage(error) || 'Ошибка генерации'
    };
  }
}

export async function completionStream(
  prompt: string,
  options: GenerationOptions = {},
  onChunk: StreamChunkCallback,
  onComplete?: StreamCompleteCallback,
  onError?: StreamErrorCallback
): Promise<void> {
  const abort = createStreamAbort(options.signal);

  try {
    // /api/completion не стримит. /v1/completions с origin часто недоступен через nginx (502).
    // POST /api/chat с stream:true — рабочий путь за /api-прокси.
    const sessionId = options.sessionId ?? `inference-${Date.now()}`;
    const grammarFields = buildGrammarApiFields({
      grammar: options.grammar,
      jsonSchema: options.jsonSchema,
    });

    const requestStartedAt = performance.now();
    const response = await fetchChatApi('/chat', {
      method: 'POST',
      headers: getStreamHeaders(sessionId),
      body: JSON.stringify({
        message: prompt,
        stream: true,
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        topP: options.topP,
        topK: options.topK,
        repetitionPenalty: options.repeatPenalty,
        sessionId,
        chatId: options.chatId ?? sessionId,
        history: options.history ?? [],
        system_prompt: options.systemPrompt,
        systemPrompt: options.systemPrompt,
        ...grammarFields,
      }),
      signal: abort.signal,
    }, STREAM_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    await consumeChatStream(response, abort.signal, onChunk, onComplete, {
      requestStartedAt,
      label: 'inference-stream',
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      if (abort.didTimeout()) {
        onError?.(new Error('Таймаут генерации (10 минут)'));
      }
      return;
    }
    console.error('Completion stream error:', error);
    onError?.(error instanceof Error ? error : new Error(getErrorMessage(error)));
  } finally {
    abort.cleanup();
  }
}

export async function generateWithPredictor(
  prompt: string, 
  options: {
    predictorType: string;
    predictorOptions?: UnknownRecord;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
  }
) {
  try {
    return await llamaApi.generateWithPredictor(prompt, options);
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка генерации с predictor'
    };
  }
}

// ========== EMBEDDINGS ==========

export async function getEmbedding(text: string): Promise<{ success: boolean; embedding?: number[]; vectorSize?: number; generationTime?: string; error?: string }> {
  try {
    const response = await llamaApi.getEmbedding(text);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка получения embedding'
    };
  }
}

export async function compareEmbeddings(
  text1: string, 
  text2: string
): Promise<{ success: boolean; similarity?: number; interpretation?: string; generationTime?: string; error?: string }> {
  try {
    const response = await llamaApi.compareEmbeddings(text1, text2);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка сравнения embeddings'
    };
  }
}


function parseGrammarResponse(response: unknown, defaultType: string): GrammarResponseEx {
  if (typeof response === 'string') {
    return { success: true, grammar: response, type: defaultType };
  }
  if (response && typeof response === 'object') {
    const record = response as UnknownRecord;
    return {
      success: 'success' in record ? Boolean(record.success) : true,
      grammar: typeof record.grammar === 'string' ? record.grammar : undefined,
      error: typeof record.error === 'string' ? record.error : undefined,
      type: typeof record.type === 'string' ? record.type : defaultType
    };
  }
  throw new Error('Неожиданный формат ответа');
}

function parseFunctionDocumentationResponse(
  response: unknown,
  format: string
): FunctionDocumentationEx {
  const normalized = normalizeFunctionDocumentationResponse(response, format);
  return {
    success: normalized.success,
    documentation: normalized.documentation,
    error: normalized.error,
    format: normalized.format,
    language: normalized.language,
    functionCount: normalized.functionCount,
    modelName: normalized.modelName,
    role: normalized.role,
  };
}

// ========== РАНЖИРОВАНИЕ И ГРАММАТИКИ ==========

export async function rankDocuments(
  query: string, 
  documents: string[]
): Promise<{ success: boolean; results?: UnknownRecord[]; generationTime?: string; error?: string }> {
  try {
    const response = await llamaApi.rankDocuments(query, documents);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка ранжирования документов'
    };
  }
}

export async function listGrammarTemplates(): Promise<{ success: boolean; templates: string[]; error?: string }> {
  return llamaApi.listGrammarTemplates();
}

export async function getGrammar(type: string): Promise<GrammarResponseEx> {
  try {
    const response = await llamaApi.getGrammar(type);
    return parseGrammarResponse(response, type);
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка получения грамматики'
    };
  }
}

export async function createJsonSchemaGrammar(schema: UnknownRecord): Promise<GrammarResponseEx> {
  try {
    const response = await llamaApi.createJsonSchemaGrammar(schema);
    return parseGrammarResponse(response, 'json_schema');
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка создания JSON Schema грамматики'
    };
  }
}

export async function setTokenBias(
  tokens: number[], 
  bias: number | 'never'
): Promise<{ success: boolean; message?: string; bias?: number | 'never'; error?: string }> {
  try {
    const response = await llamaApi.setTokenBias(tokens, bias);
    return response;
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error) || 'Ошибка установки token bias'
    };
  }
}

// ========== WRAPPERS ==========

export async function getChatWrappers(): Promise<{ success: boolean; wrappers?: ChatWrapperInfo[]; error?: string }> {
  try {
    const response = await llamaApi.getChatWrappers();
    const wrappers = response.wrappers || [];
    const xlamWrapperExists = wrappers.some(w => w.name === 'xlam');
    if (!xlamWrapperExists) {
      wrappers.push({
        name: 'xlam',
        description: 'xLAM-2 format with tools support',
        supportsTools: true,
        supportsSystemMessage: true,
        supportsFunctions: true,
        requiresModel: 'xlam'
      });
    }
    return { success: response.success, wrappers, error: response.error };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка получения wrappers' };
  }
}

export async function getChatWrapperInfo(wrapper: string): Promise<{ success: boolean; wrapper?: ChatWrapperInfo; error?: string }> {
  try {
    const response = await llamaApi.getChatWrapperInfo(wrapper);
    if (wrapper === 'xlam' && !response.wrapper) {
      return {
        success: true,
        wrapper: {
          name: 'xlam',
          description: 'xLAM-2 format with tools support',
          supportsTools: true,
          supportsSystemMessage: true,
          supportsFunctions: true,
          requiresModel: 'xlam'
        }
      };
    }
    return response;
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка получения информации о wrapper' };
  }
}

export async function getAllChatWrappers(): Promise<{ success: boolean; wrappers?: ChatWrapperInfo[]; error?: string }> {
  try {
    const response = await llamaApi.getAllChatWrappers();
    const wrappers = response.wrappers || [];
    const xlamWrapperExists = wrappers.some(w => w.name === 'xlam');
    if (!xlamWrapperExists) {
      wrappers.push({
        name: 'xlam',
        description: 'xLAM-2 format with tools support',
        supportsTools: true,
        supportsSystemMessage: true,
        supportsFunctions: true,
        requiresModel: 'xlam'
      });
    }
    return { success: response.success, wrappers, error: response.error };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка получения всех wrappers' };
  }
}

export async function testChatWrapper(options: {
  wrapper?: string;
  wrapperOptions?: UnknownRecord;
  history?: ChatMessage[];
  systemPrompt?: string;
}) {
  try {
    return await llamaApi.testChatWrapper(options);
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка тестирования wrapper' };
  }
}

// ========== ДОКУМЕНТАЦИЯ И СИСТЕМНАЯ ИНФОРМАЦИЯ ==========

export async function generateFunctionDocumentation(
  functions?: unknown,
  format = 'markdown',
  documentParameters = true
): Promise<FunctionDocumentationEx> {
  try {
    const response = await llamaApi.generateFunctionDocumentation(functions, format, documentParameters);
    return parseFunctionDocumentationResponse(response, format);
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка генерации документации функций' };
  }
}

export async function getSystemInfo(): Promise<SystemInfoEx> {
  try {
    const response = await llamaApi.getSystemInfo();
    return { success: true, info: response };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка получения системной информации' };
  }
}

export async function cleanupSessions(maxAgeMinutes = 60): Promise<{ success: boolean; message?: string; cleaned?: number; error?: string }> {
  try {
    const response = await llamaApi.cleanupSessions(maxAgeMinutes);
    return response;
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка очистки сессий' };
  }
}

export async function testModel(modelId: string) {
  try {
    return await llamaApi.testModel(modelId);
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Ошибка тестирования модели', modelId };
  }
}

export function clearCache() {
  llamaApi.clearCache();
}

export async function testAllAPIFunctions() {
  const results: UnknownRecord[] = [];
  try {
    try {
      const apiInfo = await llamaApi.getApiInfo();
      results.push({ name: 'API Info', success: true, data: apiInfo });
    } catch (e: unknown) { results.push({ name: 'API Info', success: false, error: getErrorMessage(e) }); }
    
    try {
      const health = await llamaApi.getHealth();
      results.push({ name: 'Health', success: true, data: health });
    } catch (e: unknown) { results.push({ name: 'Health', success: false, error: getErrorMessage(e) }); }
    
    let status;
    try {
      status = await llamaApi.getStatus();
      results.push({ name: 'Status', success: isServerOnline(status), data: status });
    } catch (e: unknown) { results.push({ name: 'Status', success: false, error: getErrorMessage(e) }); }
    
    try {
      const models = await llamaApi.getModels();
      results.push({ name: 'Get Models', success: Array.isArray(models), data: models });
    } catch (e: unknown) { results.push({ name: 'Get Models', success: false, error: getErrorMessage(e) }); }
    
    try {
      const systemInfo = await llamaApi.getSystemInfo();
      results.push({ name: 'System Info', success: true, data: systemInfo });
    } catch (e: unknown) { results.push({ name: 'System Info', success: false, error: getErrorMessage(e) }); }

    if (status && status.modelLoaded) {
      try {
        const embedding = await llamaApi.getEmbedding('test');
        results.push({ name: 'Embedding', success: embedding.success, data: embedding });
      } catch (e: unknown) { results.push({ name: 'Embedding', success: false, error: getErrorMessage(e) }); }
    }
    
    return {
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) || 'Unknown error running tests', results };
  }
}

export async function checkConnection(): Promise<{
  connected: boolean;
  serverReady: boolean;
  activeModel: string | null;
  message: string;
  details?: UnknownRecord;
}> {
  try {
    const status = await getServerStatus();
    const health = await checkHealth();
    return {
      connected: isServerOnline(status),
      serverReady: status.serverReady,
      activeModel: status.activeModel,
      message: isServerOnline(status) ? 'Сервер подключен' : 'Сервер недоступен',
      details: { status, health }
    };
  } catch (error: unknown) {
    return {
      connected: false,
      serverReady: false,
      activeModel: null,
      message: `Ошибка подключения: ${getErrorMessage(error)}`,
      details: { error: getErrorMessage(error) }
    };
  }
}

// ========== УТИЛИТЫ ДЛЯ РАБОТЫ С МОДЕЛЯМИ ==========

export function getModelFamilyFromName(name: string): string {
  if (!name) return 'unknown';
  const nameLower = name.toLowerCase();
  if (nameLower.includes('saiga')) return 'saiga';
  if (nameLower.includes('zephyr')) return 'zephyr';
  if (nameLower.includes('deepseek')) return 'deepseek';
  if (nameLower.includes('xlam')) return 'xlam';
  if (nameLower.includes('mistral')) return 'mistral';
  if (nameLower.includes('llama')) return 'llama';
  if (nameLower.includes('qwen')) return 'qwen';
  return 'unknown';
}

export function isQwenModel(model: ModelInfo | null): boolean {
  if (!model) return false;
  const nameLower = model.name?.toLowerCase() || '';
  return model.modelFamily === 'qwen' || 
         nameLower.includes('qwen') ||
         model.chatTemplate === 'chatml';
}

export function isQwen36Model(model: ModelInfo | null): boolean {
  return isQwenThinkingModel(model);
}

export function isQwenThinkingModel(model: ModelInfo | null): boolean {
  if (!model) return false;
  const nameLower = `${model.name || ''} ${model.id || ''}`.toLowerCase();
  if (!isQwenModel(model)) return false;
  return /qwen[\s._-]*3/.test(nameLower) || nameLower.includes('thinking');
}

export function getQwen36Options(mode: 'thinking' | 'instruct' | 'coding' = 'thinking'): Partial<GenerationOptions> {
  switch (mode) {
    case 'thinking':
      return {
        temperature: 1.0,
        topP: 0.95,
        topK: 20,
        repeatPenalty: 1.0,
        maxTokens: 32768,
        enableThinking: true
      };
    case 'instruct':
      return {
        temperature: 0.7,
        topP: 0.80,
        topK: 20,
        repeatPenalty: 1.5,
        maxTokens: 8192,
        enableThinking: false
      };
    case 'coding':
      return {
        temperature: 0.6,
        topP: 0.95,
        topK: 20,
        repeatPenalty: 1.0,
        maxTokens: 81920,
        enableThinking: true
      };
    default:
      return {};
  }
}

export function convertToXLAMModel(model: ModelInfo): XLAMModel {
  const extended = model as ModelInfo & {
    updated?: string;
    relativePath?: string;
    directory?: string;
  };
  const modelFamily = getModelFamilyFromName(model.name) as XLAMModel['modelFamily'];
  const supportsTools = model.supportsTools || detectXLAMModel(model.name);
  return {
    id: model.id || '',
    name: model.name || 'Unknown Model',
    parameters: model.parameters || '8B',
    updated: model.lastModified || extended.updated || model.lastScanned || (new Date().toISOString().split('T')[0] ?? ''),
    type: model.type || 'GGUF',
    description: model.description || '',
    isGGUF: true,
    capabilities: getModelCapabilities(model),
    available: model.available || false,
    active: model.active || false,
    size: model.size || 'N/A',
    recommended: model.recommended || false,
    source: 'server' as const,
    modelKey: model.modelKey || model.id || '',
    file: model.file || '',
    path: model.path || '',
    supportsTools: supportsTools,
    modelFamily: (extended.modelFamily as XLAMModel['modelFamily'] | undefined) || modelFamily,
    relativePath: extended.relativePath || '',
    directory: extended.directory || '',
    quantType: model.quantType,
    isInstruct: model.isInstruct,
    chatTemplate: getChatTemplateForModel(model.name, modelFamily ?? 'unknown'),
    rawSize: model.rawSize,
    lastScanned: model.lastScanned
  };
}

function getChatTemplateForModel(modelName: string, modelFamily: string): string {
  const nameLower = modelName.toLowerCase();
  switch (modelFamily) {
    case 'saiga':
    case 'mistral': return 'mistral';
    case 'xlam': return 'llama-3.1';
    case 'deepseek': return 'deepseek';
    case 'zephyr': return 'zephyr';
    case 'qwen': return 'chatml';
    case 'llama':
      if (nameLower.includes('llama-3')) return 'llama-3.1';
      return 'llama-2';
    default: return 'llama-2';
  }
}

export function detectXLAMModel(modelName: string): boolean {
  if (!modelName) return false;
  const xlamPatterns = [/xlam/i, /xlam-2/i, /large.*action.*model/i];
  return xlamPatterns.some(pattern => pattern.test(modelName));
}

export function getModelCapabilities(model: ModelInfo): string[] {
  const capabilities: string[] = model.capabilities || [];
  const modelFamily = getModelFamilyFromName(model.name);
  if (modelFamily === 'saiga') {
    if (!capabilities.includes('russian')) capabilities.push('russian');
  }
  if (modelFamily === 'qwen') {
    if (!capabilities.includes('multilingual')) capabilities.push('multilingual');
    if (!capabilities.includes('russian')) capabilities.push('russian');
  }
  if (detectXLAMModel(model.name) || model.supportsTools) {
    if (!capabilities.includes('tools')) capabilities.push('tools');
    if (!capabilities.includes('function-calling')) capabilities.push('function-calling');
  }
  return capabilities;
}

export async function checkModelSupportsTools(modelId?: string): Promise<boolean> {
  try {
    const activeModel = await getActiveModel();
    if (!activeModel) return false;
    if (modelId && activeModel.id !== modelId) {
      const models = await getModels();
      const targetModel = models.find(m => m.id === modelId);
      return targetModel?.supportsTools || detectXLAMModel(targetModel?.name || '');
    }
    return activeModel.supportsTools || detectXLAMModel(activeModel.name || '');
  } catch (error) {
    console.error('Error checking model tools support:', error);
    return false;
  }
}

export const formatUtils = {
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  formatGenerationTime(ms?: string): string {
    if (!ms) return 'N/A';
    const num = parseFloat(ms);
    if (num < 1000) return `${num.toFixed(1)}ms`;
    if (num < 60000) return `${(num / 1000).toFixed(2)}s`;
    return `${(num / 60000).toFixed(1)}m`;
  },
  formatSimilarity(similarity: number): string { return `${(similarity * 100).toFixed(1)}%`; },
  formatToolCall(toolCall: XlamToolCall): string {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return `${toolCall.function.name}(${Object.keys(args).map(k => `${k}: ${args[k]}`).join(', ')})`;
    } catch { return `${toolCall.function.name}(...)`; }
  }
};

// ========== ИНСТРУМЕНТЫ ПО УМОЛЧАНИЮ ==========

export const DEFAULT_TOOLS: XlamToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Получить текущую погоду для указанного местоположения',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Город и страна' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Единица измерения' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Выполнить математические вычисления',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string', description: 'Математическое выражение' } },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_bitrix24_lead',
      description: 'Создает новый лид в CRM Bitrix24 на основе предоставленной информации',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Название лида (например, "Запрос на услуги")' },
          name: { type: 'string', description: 'Имя контакта' },
          last_name: { type: 'string', description: 'Фамилия контакта' },
          phone: { type: 'string', description: 'Номер телефона' },
          email: { type: 'string', description: 'Email адрес' },
          comments: { type: 'string', description: 'Комментарий к лиду' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Поиск информации в интернете',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Поисковый запрос' },
          max_results: { type: 'number', description: 'Макс. кол-во результатов', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Получить текущее время для указанного часового пояса',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Часовой пояс (например, "Europe/Moscow")', default: 'UTC' }
        },
        required: []
      }
    }
  }
];

// ========== ЭКСПОРТ СЕРВИСА ==========

export const agentService = {
  getApiInfo, getConfig, checkHealth, getRootHealth, ping, getDetailedServerHealth,
  getServerStatus, getModels, scanModels, scanModelsDirectory,
  startModel, stopModel, switchModel, unloadModelWithAdapter, getModelCompatibility,
  getModelInfo, getModelInsights,
  estimateResources, autoConfigure, getActiveModel, isModelRunning,
  createChatSession, chatAgent, chatWithWrapper, smartChat, chatWithSaiga,
  getAvailableTools, executeTool, chatWithTools, chatWithToolsSimple,
  chatWithToolsCycle: clientSideToolsLoop, clientSideToolsLoop,
  getChatHistory, clearChatHistory, generateCompletion, completionStream, generateWithPredictor,
  getEmbedding, compareEmbeddings, rankDocuments, listGrammarTemplates, getGrammar,
  createJsonSchemaGrammar, setTokenBias, getChatWrappers, getChatWrapperInfo,
  getAllChatWrappers, testChatWrapper, generateFunctionDocumentation,
  getSystemInfo, cleanupSessions, testModel, testAllAPIFunctions,
  checkConnection, clearCache, convertToXLAMModel, detectXLAMModel,
  getModelCapabilities, getModelFamilyFromName, checkModelSupportsTools,
  formatUtils, adapterService, DEFAULT_TOOLS, isQwenModel, isQwen36Model, getQwen36Options,
  // Streaming методы
  chatStream,
  chatStreamWithTools,
  chatStreamVision,
  getVisionStatus,
  getHeaders
};

// ========== ЭКСПОРТ ТИПОВ ==========

export type {
  XlamToolDefinition as ToolDefinition,
  XlamToolCall as ToolCall,
  XlamToolCallMessage as ToolCallMessage,
  XlamAgentResponse as AgentResponse,
  XlamOptions as AgentOptions,
  ChatMessage,
  GenerationOptions,
  ModelInfo,
  ServerStatus,
  ModelControlResponse,
  GenerationResponse,
  ChatResponse,
  EmbeddingResponse,
  EmbeddingCompareResponse,
  RankingResponse,
  GrammarResponse,
  ModelInsights,
  ResourceEstimation,
  AutoConfiguration,
  ChatWrapperInfo,
  ChatSession,
  SystemInfo,
  FunctionDocumentation,
  TokenPredictorOptions
};

// Экспорт по умолчанию
export default agentService;