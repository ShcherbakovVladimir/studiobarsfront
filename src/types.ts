// /home/user/projects/studioxlam/src/types.ts

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue | undefined; }
export type JsonArray = JsonValue[];
export type UnknownRecord = Record<string, unknown>;
export type FinetuneConfigValue = string | number | boolean | string[] | undefined;

export type GpuStatsBundle = Record<string, Partial<GpuStat>>;

// ===================== AUTH & RUNTIME CONFIG =====================
/** JWT / GET /api/auth/me. Источник правды на бэкенде: users.role */
export type UserRole = 'user' | 'employee' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  displayName?: string;
  isActive?: boolean;
}

export interface UserSettings {
  [key: string]: unknown;
  inferenceLab?: boolean;
}

export interface RuntimeConfig {
  defaultModelId: string;
  features: {
    ragEnabled: boolean;
    supportsTools: boolean;
    bitrix24Enabled: boolean;
    inferenceLabEnabled?: boolean;
    inferenceLabAdminOnly?: boolean;
  };
  ragDefaults: {
    temperature: number;
    topP: number;
    limit: number;
    relevanceScore: number;
    systemPrompt: string;
    enableThinking: boolean;
    preserveThinking: boolean;
    qwenMode: string;
  };
  chatDefaults: {
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
  };
  urls: {
    chatApiUrl: string;
    ragApiUrl: string;
    llamaApiUrl: string;
    wsUrl: string;
    finetuneWsUrl: string;
    errorReportUrl: string;
  };
  updatedAt?: string;
  source?: string;
}

export interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  emailVerificationRequired: boolean;
  maintenance: { enabled: boolean; message?: string } | null;
}

// ===================== ADMIN =====================
export interface AdminUser extends User {
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  settings?: UserSettings;
}

export interface AdminConversationListParams {
  userId?: string;
  role?: UserRole | '';
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminChatRow {
  rowId: string;
  userId: string;
  email?: string;
  role?: string;
  chatId: string;
  title?: string;
  messageCount?: number;
  lastMessage?: string;
  updatedAt?: string;
}

export interface AdminSessionRow {
  rowId: string;
  userId: string;
  email?: string;
  role?: string;
  sessionId: string;
  title?: string;
  messageCount?: number;
  lastMessage?: string;
  updatedAt?: string;
}

export interface AdminDashboardData {
  users?: { total?: number; verified?: number; admins?: number };
  chats?: { total?: number };
  rag?: { sessions?: number; documents?: number };
  system?: UnknownRecord;
  recentActivity?: AdminAuditEvent[];
  [key: string]: unknown;
}

export interface HelpDocMeta {
  slug: string;
  title: string;
  section?: string;
  sectionLabel?: string;
  summary?: string;
  roles?: string[];
  file?: string;
}

export interface HelpDocsSection {
  id: string;
  label: string;
  docs: HelpDocMeta[];
}

export interface HelpDocsCatalog {
  success: boolean;
  role?: string;
  count: number;
  docs: HelpDocMeta[];
  sections: HelpDocsSection[];
}

export interface HelpDocArticle extends HelpDocMeta {
  markdown?: string;
  markdownLinked: string;
}

export interface AdminMaintenanceSettings {
  enabled: boolean;
  message?: string;
  allowAdminAccess?: boolean;
  scheduledAt?: string | null;
}

export interface AdminBackupItem {
  id: string;
  type: string;
  createdAt: string;
  size?: number;
  status?: string;
  filename?: string;
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  details?: UnknownRecord;
  createdAt: string;
}

export interface AdminMailSettings {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface AdminReindexStatus {
  status?: string;
  progress?: number;
  message?: string;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface ChatSummary {
  id: string;
  modelId?: string;
  sessionId?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount: number;
  lastMessage?: string;
  userId?: string;
}

export interface PersistedChat {
  id: string;
  modelId?: string;
  sessionId?: string;
  title?: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  chatWrapper?: string;
  metadata?: UnknownRecord;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
}

export type AdminUserChatUpdateBody = Partial<
  Pick<PersistedChat, 'title' | 'messages' | 'systemPrompt' | 'modelId' | 'sessionId' | 'chatWrapper' | 'metadata'>
>;

export interface RagSession {
  sessionId: string;
  title: string;
  customTitle?: boolean;
  updatedAt: string;
  messageCount: number;
  count: number;
}

export interface RagDocument {
  source: string;
  chunks?: number;
  embedded_chunks?: number;
  missing_embeddings?: number;
  completion_percentage?: number;
  embedding_status?: string;
  is_fully_indexed?: boolean;
  indexing_in_progress?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export type UserFileStatus =
  | 'queued'
  | 'rendering'
  | 'ocr'
  | 'correcting'
  | 'indexing'
  | 'ready'
  | 'error';

export interface UserFile {
  id: string;
  originalName: string;
  displayName?: string;
  status: UserFileStatus;
  progress: number;
  statusMessage?: string;
  error?: string;
  ragSource?: string;
  pageCount?: number;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  replaced?: boolean;
}

export interface RagDocumentPreview {
  success: boolean;
  preview?: string;
  chunks_preview?: UnknownRecord[];
  estimated_chunks?: number;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface ChatListState {
  chats: ChatSummary[];
  activeChatId: string | null;
  isLoading: boolean;
  isPrefetchDone: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

export interface RuntimeConfigState {
  config: RuntimeConfig | null;
  isLoaded: boolean;
  error: string | null;
}

// ===================== МОДЕЛИ =====================
export interface XLAMModel {
  id: string;
  name: string;
  parameters: string;
  updated: string;
  type: string;
  description: string;
  isGGUF: boolean;
  capabilities: string[];
  available?: boolean;
  active?: boolean;
  size?: string;
  recommended?: boolean;
  source?: 'server' | 'local';
  modelKey?: string;
  file?: string;
  path?: string;
  supportsTools?: boolean;
  quantType?: string;
  isInstruct?: boolean;
  chatTemplate?: string;
  rawSize?: number;
  lastScanned?: string;
  modelFamily?: 'llama' | 'mistral' | 'saiga' | 'xlam' | 'deepseek' | 'zephyr' | 'qwen' | 'unknown';
  relativePath?: string;
  directory?: string;
  favorite?: boolean;
}

// Для обратной совместимости
export type ModelInfo = XLAMModel;

// ===================== ЧАТ И СООБЩЕНИЯ =====================
export interface ChatImageAttachment {
  name: string;
  mimeType: string;
  previewUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  images?: ChatImageAttachment[];
  timestamp?: number | string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
  model?: string;
  isError?: boolean;
  // ========== ДОБАВИТЬ ДЛЯ STREAMING ==========
  isStreaming?: boolean;     // Флаг, что сообщение в процессе получения
  // ===========================================
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string | null;
  messages: ChatMessage[];
}

// ===================== СЕРВЕР И СТАТУС =====================
export interface ServerStatus {
  status: 'online' | 'error' | 'degraded' | 'checking' | 'offline';
  serverReady: boolean;
  activeModel: string | null;
  modelLoaded: boolean;
  timestamp: string;
  sessions?: number | { active: number, maxHistoryMessages: number };
}

export interface ModelControlResponse {
  success: boolean;
  message: string;
  activeModel: string | null;
  model?: XLAMModel;
  previousModel?: string;
}

// ===================== РЕЖИМЫ ПРОСМОТРА =====================
export const ViewMode = {
  CATALOG: 'CATALOG',
  BENCHMARK: 'BENCHMARK',
  AGENT_LAB: 'AGENT_LAB',
  FINETUNE: 'FINETUNE',
  INFERENCE_LAB: 'INFERENCE_LAB',
  RAG_ANALYTICS: 'RAG_ANALYTICS'
} as const;

export type ViewModeType = (typeof ViewMode)[keyof typeof ViewMode];

// ===================== АПП СТЕЙТ =====================
export interface HardwareStats {
  cpu: number;
  gpu: number;
  gpus?: Array<{
    key: string;
    index: number;
    name?: string;
    utilization: number;
    temperature: number;
    used_mb: number;
    total_mb: number;
    percentage: number;
  }>;
  memory?: number;
  temperature?: number;
  gpuMemory?: number;
  disk?: number;
  lastUpdated?: string;
}

export interface AppState {
  viewMode: ViewModeType;
  isDarkMode: boolean;
  hardwareStats: HardwareStats;
  serverStatus: ServerStatus;
}

// ===================== МОДЕЛИ СТЕЙТ =====================
export interface ModelsState {
  selectedModelId: string;
  favorites: string[];
  activeModel: string | null;
  models: XLAMModel[];
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: string | null;
}

// ===================== ЧАТ СТЕЙТ =====================
export interface ChatState {
  histories: Record<string, ChatMessage[]>;
  settings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    repeatPenalty: number;
  };
  isLoading: boolean;
  isStreaming?: boolean;
}

// ===================== GPU И СИСТЕМНЫЕ СТАТИСТИКИ =====================
export interface GpuStat {
  used: number;
  total: number;
  used_mb?: number;
  total_mb?: number;
  percentage: number;
  temperature: number;
  utilization: number;
  powerDraw?: number;
  power?: number;
  memoryClock?: number;
  memory_clock?: number;
  graphicsClock?: number;
  core_clock?: number;
  fanSpeed?: number;
  fan?: number;
  name: string;
  uuid: string;
  index: number;
}

export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  uptime: number;
  totalMemory?: string;
  usedMemory?: string;
  freeMemory?: string;
  uptimeFormatted?: string;
  temperature?: number;
}

// ===================== БЕНЧМАРКИ =====================
export interface BenchmarkData {
  device: string;
  tps: number;
  latency: number;
  memory: number;
}

export interface BenchmarkResult {
  device: string;
  tps: number;
  latency: number;
  memory: number;
  precision: string;
  temperature?: number;
  utilization?: number;
  powerDraw?: number;
  fanSpeed?: number;
  memoryClock?: number;
  coreClock?: number;
  timestamp: string;
  isReal?: boolean;
}

export interface BenchmarkStats {
  avgTps: number;
  maxTps: number;
  minTps: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  avgTemperature: number;
  maxTemperature: number;
  avgUtilization: number;
  peakPowerDraw: number;
  totalSamples: number;
  activeDevices: number;
  totalMemoryUsed: number;
  lastUpdated: string;
}

// ===================== ФАЙНТЬЮН =====================
export interface FinetuneConfig {
  // Основные параметры модели
  modelName: string;
  baseModel: string;
  modelType: 'llama' | 'mistral' | 'gemma' | 'qwen' | 'custom';
  
  // Параметры обучения
  epochs: number;
  batchSize: number;
  learningRate: number;
  warmupSteps: number;
  weightDecay: number;
  gradientAccumulationSteps: number;
  
  // LoRA параметры
  useLora: boolean;
  loraRank: number;
  loraAlpha: number;
  loraDropout: number;
  targetModules: string[];
  
  // Данные
  datasetPath: string;
  datasetType: 'jsonl' | 'parquet' | 'csv' | 'text';
  trainSplit: number;
  validationSplit: number;
  maxLength: number;
  
  // Выходные данные
  outputDir: string;
  checkpointDir: string;
  saveSteps: number;
  saveTotalLimit: number;
  
  // Дополнительные опции
  useFlashAttention: boolean;
  useGradientCheckpointing: boolean;
  mixedPrecision: 'fp16' | 'bf16' | 'fp32';
  seed: number;
  
  // Мониторинг
  loggingSteps: number;
  evaluationStrategy: 'steps' | 'epoch' | 'no';
  evalSteps: number;
  
  // Оптимизатор
  optimizer: 'adamw' | 'adam' | 'sgd';
  scheduler: 'linear' | 'cosine' | 'constant';
  
  // Для обратной совместимости
  [key: string]: FinetuneConfigValue;
}

export const DEFAULT_FINETUNE_CONFIG: FinetuneConfig = {
  modelName: "Llama-xLAM-2-8B-fc-r-F16",
  baseModel: "",
  modelType: "llama",
  epochs: 2,
  batchSize: 1,
  learningRate: 0.0001,
  warmupSteps: 100,
  weightDecay: 0.01,
  gradientAccumulationSteps: 1,
  useLora: true,
  loraRank: 16,
  loraAlpha: 32,
  loraDropout: 0.1,
  targetModules: ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
  datasetPath: "",
  datasetType: "jsonl",
  trainSplit: 0.9,
  validationSplit: 0.1,
  maxLength: 2048,
  outputDir: "./output",
  checkpointDir: "./checkpoints",
  saveSteps: 500,
  saveTotalLimit: 5,
  useFlashAttention: true,
  useGradientCheckpointing: false,
  mixedPrecision: "bf16",
  seed: 42,
  loggingSteps: 10,
  evaluationStrategy: "steps",
  evalSteps: 100,
  optimizer: "adamw",
  scheduler: "cosine",
};

export interface FinetuneSession {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped' | 'pending' | 'unknown';
  progress: number;
  config: Partial<FinetuneConfig>;
  startTime: string;
  endTime?: string;
  logs?: string[];
  gpuStats?: Record<string, Partial<GpuStat>>;
  exitCode?: number;
  error?: string;
  conversionStatus?: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial_success';
  convertedAdapter?: string | null;
  metrics?: {
    loss: number;
    learningRate: number;
    gradientNorm: number;
    memoryUsage: number;
    samplesPerSecond: number;
    stepsPerSecond: number;
  };
  // ========== ДОБАВИТЬ ДЛЯ ВОССТАНОВЛЕНИЯ ==========
  normalizedId?: string;
  conversionAttempted?: boolean;
  conversionStartTime?: string;
  conversionEndTime?: string;
  conversionTime?: string;
  resumeAttempted?: boolean;
  resumeTime?: string;
  resumeStep?: number;
  tempConfigPath?: string;
  datasetPath?: string;
  baseModel?: {
    id: string;
    name: string;
    file: string;
    path: string;
    parameters: string;
    size: string;
    chatTemplate: string;
    supportsTools: boolean;
  };
  paths?: {
    outputDir?: string;
    checkpointsDir?: string;
    metadataPath?: string;
    peftDir?: string;
  };
  metadata?: UnknownRecord;
  // ================================================
}

export interface DatasetStats {
  totalExamples: number;
  trainExamples: number;
  validationExamples: number;
  avgTokensPerExample: number;
  totalTokens: number;
}

export interface TrainingMetrics {
  loss: number;
  learningRate: number;
  gradientNorm: number;
  memoryUsage: number;
  samplesPerSecond: number;
  stepsPerSecond: number;
}

export interface ExportOptions {
  format: 'gguf' | 'safetensors' | 'pytorch';
  quantization: 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0';
  includeLora: boolean;
  mergeWeights: boolean;
  outputPath: string;
}

export interface UIState {
  activeTab: 'train' | 'sessions' | 'models' | 'datasets' | 'settings';
  expandedPanels: {
    config: boolean;
    dataset: boolean;
    monitoring: boolean;
    logs: boolean;
  };
  showAdvancedSettings: boolean;
  darkMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface FinetuneState {
  // Основное состояние тренировки
  isTraining: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isPendingOperation: boolean;
  
  // Прогресс и метрики
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  metrics: TrainingMetrics;
  
  // Логи и история
  logs: string[];
  logLevel: 'all' | 'debug' | 'info' | 'warning' | 'error';
  autoScrollLogs: boolean;
  
  // Конфигурация тренировки
  config: FinetuneConfig;
  
  // Данные для тренировки
  dataset: File | null;
  datasetInfo: DatasetInfo | null;
  datasetStats: DatasetStats;
  
  // GPU и системные ресурсы
  gpuStats: Record<string, GpuStat>;
  systemStats: SystemStats;
  
  // Управление сессиями
  sessionId: string | null;
  currentSession: FinetuneSession | null;
  sessions: FinetuneSession[];
  recentSessions: FinetuneSession[];
  selectedSessionId: string | null;
  
  // Состояние вебсокета
  websocketConnected: boolean;
  websocketReconnecting: boolean;
  lastWebsocketMessage: WebSocketMessage | null;
  
  // История тренировок
  trainingHistory: UnknownRecord[];
  
  // Ошибки и предупреждения
  error: string | null;
  errors: string[];
  warnings: string[];
  
  // Состояние UI
  uiState: UIState;
  
  // Параметры экспорта и сохранения
  exportOptions: ExportOptions;
  
  // Параметры валидации
  validationResults: unknown;
  evaluationMetrics: unknown;
  
  // Флаги состояния
  isInitialized: boolean;
  isDatasetLoaded: boolean;
  isConfigValid: boolean;
  isExporting: boolean;
  isImporting: boolean;
}

// ===================== ИНСТРУМЕНТЫ И АДАПТЕРЫ =====================
export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: JsonValue;
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  returns?: {
    type: string;
    description?: string;
  };
}

export interface XlamToolDefinition {
  type: 'function';
  function: ToolFunction;
  name?: string;
  description?: string;
}

// Для UI компонентов инструментов
export interface ToolUIState {
  enabled: boolean;
  selectedTools: string[];
  availableTools: XlamToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: ToolParameter[];
}

export interface AdapterInfo {
  id: string;
  name: string;
  description: string;
  baseModel: string;
  type: string;
  size: number;
  createdAt?: string;
  modifiedAt?: string;
  path?: string;
  compatibleModels?: string[];
  metadata?: UnknownRecord;
  created?: string;
  sizeHuman?: string; // Для отображения
  isActive?: boolean;
}

// Для API-эндпоинтов
export interface AdapterInfoAPI {
  id: string;
  name: string;
  type: string;
  size: string;
  baseModel: string;
  description: string;
  compatibleModels: string[];
  metadata: UnknownRecord;
  created: string;
  path: string;
}

export interface AdapterLoadRequest {
  adapterId?: string;
  adapterPath?: string;
  modelId?: string;
  scale?: number;
  baseModel?: string;
}

export interface AdapterOperationResponse {
  success: boolean;
  message: string;
  adapter?: AdapterInfo | null;
  adapterPath?: string;
  error?: string;
}

// ===================== ГЕНЕРАЦИЯ =====================
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  grammar?: string;
  jsonSchema?: JsonObject;
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
  enableThinking?: boolean;
  preserveThinking?: boolean;
  mode?: 'thinking' | 'instruct' | 'coding';
}

export interface GenerationResponse {
  success: boolean;
  response: string;
  model: string | null;
  prompt?: string;
  timestamp: string;
  error?: string;
}

// ===================== API ОТВЕТЫ =====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  sessionId?: string;
  details?: UnknownRecord;
  status?: string;
  progress?: number;
  logs?: string[];
  stats?: GpuStatsBundle | DatasetStats | SystemStats | UnknownRecord;
  gpu?: GpuStatsBundle;
  gpuStats?: GpuStatsBundle;
  system?: UnknownRecord;
  sessions?: FinetuneSession[];
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ServerError {
  error?: string;
  details?: string;
  message?: string;
}

export interface ServerResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
  message?: string;
  details?: UnknownRecord;
  stats?: GpuStatsBundle | DatasetStats | UnknownRecord;
  logs?: string[];
  status?: string;
  progress?: number;
  gpuStats?: GpuStatsBundle;
}

export interface StatusResponse extends ServerResponse {
  status?: 'running' | 'completed' | 'failed' | 'stopped' | 'pending';
  progress?: number;
  details?: {
    config?: FinetuneConfig;
    startTime?: string;
    endTime?: string;
    exitCode?: number;
    error?: string;
  };
}

export interface SessionsResponse extends ServerResponse {
  sessions?: FinetuneSession[];
}

export interface LogsResponse extends ServerResponse {
  logs?: string[];
}

// ===================== ПРОМПТ ШАБЛОНЫ =====================
export interface PromptTemplate {
  id: string;
  name: string;
  value: string;
  description: string;
  category?: 'general' | 'code' | 'qa' | 'summarization' | 'translation' | 'classification';
  variables?: string[];
}

// ===================== ИНФЕРЕНС ЛАБ =====================
export interface InferenceLabState {
  input: string;
  output: string;
  isLoading: boolean;
  showMobileMenu: boolean;
  showSettings: boolean;
  isModelActionLoading: boolean;
  lastOperationResult: ModelControlResponse | null;
  activeTab: ActiveTabType;
  availableAdapters: AdapterInfo[];
  selectedAdapter: string;
  selectedAdapterPath: string;
  availableTools: XlamToolDefinition[];
  selectedTools: string[];
  useTools: boolean;
  selectedPromptTemplate: string;
  promptVariables: Record<string, string>;
  advancedOptions: {
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    repeatPenalty: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  inferenceHistory: InferenceHistoryItem[];
  workflowMode: boolean;
  workflowSteps: WorkflowStep[];
}

// Для редукс слайса InferenceLab
export interface InferenceLabReduxState {
  inferenceLab: InferenceLabState;
}

// ===================== КОНСТАНТЫ =====================
export type ActiveTabType =
  | 'inference'
  | 'adapters'
  | 'tools'
  | 'settings'
  | 'system'
  | 'history'
  | 'analytics';

export const ACTIVE_TABS = {
  INFERENCE: 'inference' as ActiveTabType,
  ADAPTERS: 'adapters' as ActiveTabType,
  TOOLS: 'tools' as ActiveTabType,
  SETTINGS: 'settings' as ActiveTabType,
  SYSTEM: 'system' as ActiveTabType,
  HISTORY: 'history' as ActiveTabType,
  ANALYTICS: 'analytics' as ActiveTabType,
} as const;

// ===================== СТАТУСЫ =====================
export type ConnectionStatus = 'checking' | 'online' | 'error' | 'offline';

export interface ConnectionStatusProps {
  status: ConnectionStatus;
  modelName?: string;
  hasAdapter?: boolean;
  hasTools?: boolean;
}

// ===================== РАСШИРЕННЫЙ СТАТУС СЕРВЕРА =====================
export interface ExtendedServerStatus extends ServerStatus {
  adapterLoaded?: boolean;
  activeAdapter?: string;
  activeAdapterPath?: string;
  toolsAvailable?: boolean;
  activeTools?: string[];
  promptTemplate?: string;
  generationOptions?: GenerationOptions;
}

// ===================== WEBSOCKET =====================
export interface WebSocketMessage {
  type: 'log' | 'status' | 'gpu_stats' | 'system_stats' | 'error' | 'session_init' | 'dataset_stats' | 'training_metrics';
  message?: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  progress?: number;
  metrics?: Partial<TrainingMetrics>;
  epoch?: { current: number, total: number };
  step?: { current: number, total: number };
  status?: FinetuneSession['status'];
  error?: string;
  gpuStats?: GpuStatsBundle;
  systemStats?: Partial<SystemStats>;
  stats?: Partial<DatasetStats>;
}

export const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 3000,
  CONNECT_TIMEOUT: 10000
} as const;

// ===================== ЗАПРОСЫ И КОНТРОЛЛЕРЫ =====================
export interface RequestController {
  abort: () => void;
  id: string;
}

// ===================== ДАТАСЕТЫ =====================
export interface DatasetInfo {
  name: string;
  size: number;
  totalExamples?: number;
  totalTokens?: number;
  lastModified?: number;
  hash?: string;
}

// ===================== ИСТОРИЯ ИНФЕРЕНСА =====================
export interface InferenceHistoryItem {
  id: string;
  timestamp: Date;
  input: string;
  output: string;
  model: string;
  adapter?: string;
  tools?: string[];
  parameters?: {
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    repeatPenalty: number;
  };
}

export type InferenceLabMode = 'completion' | 'chat';
export type InferenceResponseStatus =
  | 'pending'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface InferenceLabAccess {
  allowed: boolean;
  reason?: string;
  enabled: boolean;
  adminOnly: boolean;
  userBlocked: boolean;
}

export interface InferenceLabUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface InferenceRequestRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  mode: InferenceLabMode;
  stream: boolean;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stop?: string[];
  grammar?: string;
  jsonSchema?: UnknownRecord;
  createdAt?: string;
  preview?: string;
  response?: InferenceResponseRecord;
}

export interface InferenceResponseRecord {
  id: string;
  requestId: string;
  status: InferenceResponseStatus;
  text?: string;
  error?: string;
  latencyMs?: number;
  ttftMs?: number;
  chunkCount?: number;
  usage?: InferenceLabUsage;
  createdAt?: string;
  updatedAt?: string;
}

export interface InferenceLabPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface InferenceLabAnalyticsSummary {
  requests: number;
  completed: number;
  errors: number;
  cancelled: number;
  streamed: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgTtftMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface InferenceLabAnalytics {
  summary: InferenceLabAnalyticsSummary;
  byDay: Array<{ date: string; requests: number; completed?: number; errors?: number }>;
  byModel: Array<{ model: string; requests: number; avgLatencyMs?: number }>;
  byMode: Array<{ mode: string; stream?: boolean; requests: number }>;
  byUser?: Array<{ userId: string; email?: string; requests: number }>;
}

// ===================== ОБНОВЛЕНИЯ МОДЕЛЕЙ =====================
export interface ModelStatusUpdate {
  modelId: string;
  available?: boolean;
  active?: boolean;
  size?: string;
  source?: 'server' | 'local';
  name?: string;
  type?: string;
  description?: string;
}

// ===================== РАБОЧИЕ ПРОЦЕССЫ =====================
export interface WorkflowStep {
  id: string;
  type: 'input' | 'model' | 'tool' | 'output' | 'condition' | 'loop';
  config: UnknownRecord;
  connections: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

// ===================== КОНФИГУРАЦИИ ИНФЕРЕНСА =====================
export interface InferenceConfig {
  model: string;
  adapter?: string;
  tools: string[];
  promptTemplate: string;
  promptVariables: Record<string, string>;
  advancedOptions: {
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    repeatPenalty: number;
  };
  workflowMode: boolean;
  workflowSteps: WorkflowStep[];
}

// ===================== RAG АНАЛИТИКА =====================
// RAG сообщение
export interface RAGSource {
  source: string;
  similarity?: number;
}

export interface RAGGeneratedFile {
  id?: string;
  name?: string;
  content?: string;
  type?: string;
}

export interface RAGAttachedFile {
  name: string;
  type?: string;
  role?: 'context' | 'instruction' | 'compare_with' | string;
}

export interface RAGMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metrics?: UnknownRecord;
  sql?: string;
  explanation?: string;
  timestamp: Date | string;
  chart_data?: {
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
  execution_time?: number;
  row_count?: number;
  think_blocks?: string[];
  sources?: RAGSource[];
  generated_files?: RAGGeneratedFile[];
  attached_files?: RAGAttachedFile[];
  response_type?: 'chat' | 'document' | 'sql';
  search_mode?: 'llm' | 'direct';
  isStreaming?: boolean;
  isError?: boolean;
  isAborted?: boolean;
}

export interface RAGQuerySettings {
  limit: number;
  relevanceScore: number;
}

export interface RAGEmbeddingHealth {
  success?: boolean;
  completion_percentage?: number;
  pending_chunks?: number;
  indexing_in_progress?: boolean;
  estimated_seconds_remaining?: number;
  [key: string]: unknown;
}

// RAG запрос
export interface RAGQueryRequest {
  query: string;
  sessionId?: string;
  saveHistory?: boolean;
  generateChart?: boolean;
}

// RAG ответ
export interface RAGQueryResponse {
  success: boolean;
  text_analysis: string;
  metrics: UnknownRecord;
  chart_data: RAGMessage['chart_data'];
  insights?: string[];
  recommendations?: string[];
  sql: string;
  explanation: string;
  row_count: number;
  execution_time: number;
  session_id: string;
  error?: string;
  search_mode?: 'llm' | 'direct';
}

// ===================== RAG ТАБЛИЦЫ =====================
export interface RAGTableInfo {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
  }>;
  columnCount: number;
  rowCount: number;
  schema?: string;
}

// RAG статус БД
export interface RAGDatabaseStatus {
  connected: boolean;
  tables_count: number;
  relationships_count: number;
}

// RAG метрики
export interface RAGMetrics {
  status: 'ready' | 'initializing' | 'error';
  database_connected: boolean;
  timestamp: string;
}

// RAG схема
export interface RAGSchema {
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
}

// RAG состояние в Redux
export interface RAGState {
  sessionId: string;
  sessions: RagSession[];
  messages: RAGMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isSessionsLoaded: boolean;
  isRefreshingSessions: boolean;
  databaseStatus: RAGDatabaseStatus | null;
  metrics: RAGMetrics | null;
  schema: RAGSchema | null;
  embeddingHealth: RAGEmbeddingHealth | null;
  querySettings: RAGQuerySettings;
  error: string | null;
  searchMode: 'llm' | 'direct';
}

// ===================== STREAMING ТИПЫ =====================
export type StreamChunkCallback = (chunk: string, fullResponse: string) => void;
export type StreamCompleteCallback = (fullResponse: string) => void;
export type StreamErrorCallback = (error: Error) => void;

export interface StreamOptions {
  onChunk: StreamChunkCallback;
  onComplete?: StreamCompleteCallback;
  onError?: StreamErrorCallback;
  abortSignal?: AbortSignal;
}