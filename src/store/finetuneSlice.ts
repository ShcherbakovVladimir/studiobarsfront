// /home/user/projects/studioxlam/src/store/finetuneSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { Middleware, PayloadAction } from '@reduxjs/toolkit';
import { isGpuKey } from '../utils/gpuUtils';
import type {
  FinetuneState,
  FinetuneSession,
  FinetuneConfig,
  DatasetInfo,
  WebSocketMessage,
  GpuStat,
} from '../types';

// Вспомогательные функции для localStorage с ограничениями
const STORAGE_KEYS = {
  STATE: 'finetuneState',
  DATASET: 'finetuneDatasetInfo'
} as const;

const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

const truncateString = (str: string, maxLength: number): string => {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

const safeJsonParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Сначала определим базовую конфигурацию отдельно
const getBaseConfig = (): FinetuneConfig => ({
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
});

// Определим базовый initialState
const getBaseInitialState = (): Omit<FinetuneState, 'config'> & { config: FinetuneConfig } => ({
  // Основное состояние тренировки
  isTraining: false,
  isStarting: false,
  isStopping: false,
  isPendingOperation: false,
  
  // Прогресс и метрики
  progress: 0,
  currentEpoch: 0,
  totalEpochs: 0,
  currentStep: 0,
  totalSteps: 0,
  metrics: {
    loss: 0,
    learningRate: 0,
    gradientNorm: 0,
    memoryUsage: 0,
    samplesPerSecond: 0,
    stepsPerSecond: 0
  },
  
  // Логи и история
  logs: [],
  logLevel: 'info',
  autoScrollLogs: true,
  
  // Конфигурация тренировки
  config: getBaseConfig(),
  
  // Данные для тренировки
  dataset: null,
  datasetInfo: null,
  datasetStats: {
    totalExamples: 0,
    trainExamples: 0,
    validationExamples: 0,
    avgTokensPerExample: 0,
    totalTokens: 0
  },
  
  // GPU и системные ресурсы
  gpuStats: {
    gpu0: {
      used: 0,
      total: 0,
      percentage: 0,
      temperature: 0,
      utilization: 0,
      powerDraw: 0,
      memoryClock: 0,
      graphicsClock: 0,
      fanSpeed: 0,
      name: 'Detecting...',
      uuid: '',
      index: 0
    },
    gpu1: {
      used: 0,
      total: 0,
      percentage: 0,
      temperature: 0,
      utilization: 0,
      powerDraw: 0,
      memoryClock: 0,
      graphicsClock: 0,
      fanSpeed: 0,
      name: 'Detecting...',
      uuid: '',
      index: 1
    }
  },
  systemStats: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkUsage: 0,
    uptime: 0
  },
  
  // Управление сессиями
  sessionId: null,
  currentSession: null,
  sessions: [],
  recentSessions: [],
  selectedSessionId: null,
  
  // Состояние вебсокета
  websocketConnected: false,
  websocketReconnecting: false,
  lastWebsocketMessage: null,
  
  // История тренировок
  trainingHistory: [],
  
  // Ошибки и предупреждения
  error: null,
  errors: [],
  warnings: [],
  
  // Состояние UI
  uiState: {
    activeTab: 'train',
    expandedPanels: {
      config: true,
      dataset: true,
      monitoring: true,
      logs: true
    },
    showAdvancedSettings: false,
    darkMode: false,
    autoRefresh: true,
    refreshInterval: 5000
  },
  
  // Параметры экспорта и сохранения
  exportOptions: {
    format: 'gguf',
    quantization: 'q4_0',
    includeLora: true,
    mergeWeights: true,
    outputPath: './exported_models'
  },
  
  // Параметры валидации
  validationResults: null,
  evaluationMetrics: null,
  
  // Флаги состояния
  isInitialized: false,
  isDatasetLoaded: false,
  isConfigValid: false,
  isExporting: false,
  isImporting: false
});

// Функция для загрузки состояния с нормализацией типов
const loadState = (): Partial<FinetuneState> => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEYS.STATE);
    if (!serializedState) return {};
    
    // Проверяем размер
    if (serializedState.length > MAX_STORAGE_SIZE) {
      console.warn('State too large, skipping load');
      return {};
    }
    
    const parsed = safeJsonParse<Partial<FinetuneState>>(serializedState);
    if (!parsed) return {};
    
    const baseConfig = getBaseConfig();
    
    // Нормализация типов
    const normalized: Partial<FinetuneState> = {};
    
    // Обработка sessionId
    if (parsed.sessionId && typeof parsed.sessionId === 'string') {
      normalized.sessionId = parsed.sessionId;
    }
    
    // Обработка config - ВАЖНО: не используем initialState.config, а baseConfig
    if (parsed.config && typeof parsed.config === 'object') {
      normalized.config = {
        ...baseConfig,
        ...parsed.config,
        // Принудительная нормализация чисел
        epochs: typeof parsed.config.epochs === 'number' ? parsed.config.epochs : baseConfig.epochs,
        batchSize: typeof parsed.config.batchSize === 'number' ? parsed.config.batchSize : baseConfig.batchSize,
        learningRate: typeof parsed.config.learningRate === 'number' ? parsed.config.learningRate : baseConfig.learningRate,
        loraRank: typeof parsed.config.loraRank === 'number' ? parsed.config.loraRank : baseConfig.loraRank,
        // Для строковых полей
        modelName: typeof parsed.config.modelName === 'string' ? parsed.config.modelName : baseConfig.modelName,
        baseModel: typeof parsed.config.baseModel === 'string' ? parsed.config.baseModel : baseConfig.baseModel,
        modelType: typeof parsed.config.modelType === 'string' ? parsed.config.modelType : baseConfig.modelType,
        datasetPath: typeof parsed.config.datasetPath === 'string' ? parsed.config.datasetPath : baseConfig.datasetPath,
        datasetType: typeof parsed.config.datasetType === 'string' ? parsed.config.datasetType : baseConfig.datasetType,
        outputDir: typeof parsed.config.outputDir === 'string' ? parsed.config.outputDir : baseConfig.outputDir,
        checkpointDir: typeof parsed.config.checkpointDir === 'string' ? parsed.config.checkpointDir : baseConfig.checkpointDir,
        mixedPrecision: typeof parsed.config.mixedPrecision === 'string' ? parsed.config.mixedPrecision : baseConfig.mixedPrecision,
        optimizer: typeof parsed.config.optimizer === 'string' ? parsed.config.optimizer : baseConfig.optimizer,
        scheduler: typeof parsed.config.scheduler === 'string' ? parsed.config.scheduler : baseConfig.scheduler,
        evaluationStrategy: typeof parsed.config.evaluationStrategy === 'string' ? parsed.config.evaluationStrategy : baseConfig.evaluationStrategy,
        // Для массивов
        targetModules: Array.isArray(parsed.config.targetModules) ? parsed.config.targetModules : baseConfig.targetModules
      };
    }
    
    // Важное исправление: синхронизируем isTraining с статусом сессии
    if (parsed.currentSession && typeof parsed.currentSession === 'object') {
      const sessionStatus = parsed.currentSession.status;
      const shouldBeTraining = sessionStatus === 'running';
      
      // Проверяем время сессии
      const now = Date.now();
      if (parsed.currentSession.startTime) {
        const startTime = new Date(parsed.currentSession.startTime).getTime();
        const hoursDiff = (now - startTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          console.log('Clearing old session (>24h):', parsed.currentSession.sessionId);
        } else if (['completed', 'failed', 'stopped', 'running'].includes(sessionStatus)) {
          normalized.currentSession = {
            sessionId: parsed.currentSession.sessionId || '',
            status: sessionStatus,
            progress: typeof parsed.currentSession.progress === 'number' ? parsed.currentSession.progress : 0,
            config: normalized.config || baseConfig,
            startTime: parsed.currentSession.startTime || new Date().toISOString(),
            endTime: parsed.currentSession.endTime,
            logs: Array.isArray(parsed.currentSession.logs) ? parsed.currentSession.logs : [],
            error: parsed.currentSession.error
          };
          normalized.isTraining = shouldBeTraining;
          normalized.progress = typeof parsed.currentSession.progress === 'number' ? parsed.currentSession.progress : 0;
        }
      }
    }
    
    // Если нет сессии, но есть isTraining в сохраненном состоянии
    if (typeof parsed.isTraining === 'boolean' && !normalized.currentSession) {
      normalized.isTraining = parsed.isTraining;
    }
    
    // Обработка progress
    if (typeof parsed.progress === 'number') {
      normalized.progress = Math.max(0, Math.min(100, parsed.progress));
    }
    
    // Ограничиваем размеры массивов
    if (Array.isArray(parsed.logs)) {
      normalized.logs = parsed.logs
        .slice(-200)
        .map(log => typeof log === 'string' ? truncateString(log, 1000) : '');
    }
    
    if (Array.isArray(parsed.recentSessions)) {
      normalized.recentSessions = parsed.recentSessions
        .filter(s => s && typeof s === 'object' && s.sessionId)
        .slice(0, 50)
        .map(session => ({
          sessionId: session.sessionId,
          status: session.status || 'unknown',
          progress: typeof session.progress === 'number' ? session.progress : 0,
          config: session.config || baseConfig,
          startTime: session.startTime || new Date().toISOString(),
          endTime: session.endTime,
          logs: Array.isArray(session.logs) ? session.logs : []
        }));
    }
    
    if (Array.isArray(parsed.errors)) {
      normalized.errors = parsed.errors
        .slice(-50)
        .map(error => typeof error === 'string' ? truncateString(error, 500) : '');
    }
    
    if (Array.isArray(parsed.warnings)) {
      normalized.warnings = parsed.warnings
        .slice(-50)
        .map(warning => typeof warning === 'string' ? truncateString(warning, 500) : '');
    }
    
    if (Array.isArray(parsed.trainingHistory)) {
      normalized.trainingHistory = parsed.trainingHistory.slice(-20);
    }
    
    // Обработка logLevel
    if (parsed.logLevel && ['all', 'debug', 'info', 'warning', 'error'].includes(parsed.logLevel)) {
      normalized.logLevel = parsed.logLevel as 'all' | 'debug' | 'info' | 'warning' | 'error';
    }
    
    return normalized;
  } catch (err) {
    console.error('Could not load state from localStorage:', err);
    return {};
  }
};

// Функция для сохранения состояния с контролем размера
interface FinetunePersistedState {
  sessionId: string | null;
  config: FinetuneConfig;
  isTraining: boolean;
  progress: number;
  currentSession: {
    sessionId: string;
    status: FinetuneSession['status'];
    progress: number;
    config: Partial<FinetuneConfig>;
    startTime: string;
    endTime?: string;
    logs?: string[];
    error?: string;
  } | null;
  logs: string[];
  recentSessions: Array<{
    sessionId: string;
    status: FinetuneSession['status'];
    progress: number;
    config: Partial<FinetuneConfig>;
    startTime: string;
    endTime?: string;
    logs?: string[];
  }>;
  trainingHistory: unknown[];
  errors: string[];
  warnings: string[];
  logLevel: FinetuneState['logLevel'];
}

const saveState = (state: FinetuneState) => {
  try {
    const dataToSave: FinetunePersistedState = {
      sessionId: state.sessionId,
      config: state.config,
      isTraining: state.isTraining,
      progress: state.progress,
      currentSession: state.currentSession ? {
        sessionId: state.currentSession.sessionId,
        status: state.currentSession.status,
        progress: state.currentSession.progress,
        config: state.currentSession.config,
        startTime: state.currentSession.startTime,
        endTime: state.currentSession.endTime,
        logs: state.currentSession.logs,
        error: state.currentSession.error
      } : null,
      logs: state.logs.slice(-200).map(log => truncateString(log, 1000)),
      recentSessions: state.recentSessions.slice(0, 50).map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        progress: session.progress,
        config: session.config,
        startTime: session.startTime,
        endTime: session.endTime,
        logs: session.logs
      })),
      trainingHistory: state.trainingHistory.slice(-20),
      errors: state.errors.slice(-50).map(error => truncateString(error, 500)),
      warnings: state.warnings.slice(-50).map(warning => truncateString(warning, 500)),
      logLevel: state.logLevel
    };
    
    const serializedState = JSON.stringify(dataToSave);
    
    if (serializedState.length > MAX_STORAGE_SIZE) {
      console.warn('State too large, truncating logs');
      dataToSave.logs = [];
      dataToSave.errors = [];
      dataToSave.warnings = [];
    }
    
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(dataToSave));
  } catch (err) {
    console.error('Could not save state to localStorage:', err);
  }
};

// Загружаем начальное состояние
const savedState = loadState();

// Создаем окончательный initialState
const initialState: FinetuneState = {
  ...getBaseInitialState(),
  ...savedState,
  // Гарантируем что config всегда полный
  config: savedState.config || getBaseConfig(),
  // Переопределяем некоторые поля чтобы избежать undefined
  isTraining: savedState.isTraining !== undefined ? savedState.isTraining : false,
  progress: savedState.progress !== undefined ? savedState.progress : 0,
  logs: Array.isArray(savedState.logs) ? savedState.logs : [],
  recentSessions: Array.isArray(savedState.recentSessions) ? savedState.recentSessions : [],
  trainingHistory: Array.isArray(savedState.trainingHistory) ? savedState.trainingHistory : [],
  errors: Array.isArray(savedState.errors) ? savedState.errors : [],
  warnings: Array.isArray(savedState.warnings) ? savedState.warnings : []
};

const finetuneSlice = createSlice({
  name: 'finetune',
  initialState,
  reducers: {
    // === Основное состояние тренировки ===
    setTrainingStatus: (state, action: PayloadAction<boolean>) => {
      state.isTraining = action.payload;
      if (!action.payload) {
        state.progress = 0;
        state.currentEpoch = 0;
        state.currentStep = 0;
      }
    },
    
    setStartingStatus: (state, action: PayloadAction<boolean>) => {
      state.isStarting = action.payload;
      state.isPendingOperation = action.payload;
    },
    
    setStoppingStatus: (state, action: PayloadAction<boolean>) => {
      state.isStopping = action.payload;
      state.isPendingOperation = action.payload;
    },
    
    setPendingOperation: (state, action: PayloadAction<boolean>) => {
      state.isPendingOperation = action.payload;
      if (!action.payload) {
        state.isStarting = false;
        state.isStopping = false;
      }
    },
    
    // === Прогресс и метрики ===
    updateProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, action.payload));
    },
    
    updateEpoch: (state, action: PayloadAction<{current: number, total: number}>) => {
      state.currentEpoch = action.payload.current;
      state.totalEpochs = action.payload.total;
    },
    
    updateStep: (state, action: PayloadAction<{current: number, total: number}>) => {
      state.currentStep = action.payload.current;
      state.totalSteps = action.payload.total;
    },
    
    updateMetrics: (state, action: PayloadAction<Partial<FinetuneState['metrics']>>) => {
      state.metrics = { ...state.metrics, ...action.payload };
    },
    
    // === Логи и история ===
    addLog: (state, action: PayloadAction<string>) => {
      // Проверяем на пустые строки и специальные значения
      const message = action.payload?.trim();
      
      if (!message || message === '' || message === '""') {
        console.warn('Skipping empty log message');
        return;
      }
      
      const timestamp = new Date().toISOString();
      
      // Определяем формат сообщения
      let logEntry = message;
      
      // Если сообщение уже содержит timestamp в формате ISO (от WebSocket), используем как есть
      if (message.startsWith('20') && message.includes('T') && message.includes('Z')) {
        // Сообщение уже отформатировано
        logEntry = message;
      } else if (message.includes(' - ') && message.includes(' - INFO - ') || 
                message.includes(' - ERROR - ') || 
                message.includes(' - WARNING - ') ||
                message.includes(' - DEBUG - ')) {
        // Сообщение уже отформатировано в Python стиле
        logEntry = message;
      } else {
        // Форматируем по умолчанию
        logEntry = `[${timestamp}] ${message}`;
      }
      
      state.logs.push(logEntry);
      
      if (state.logs.length > 10000) {
        state.logs.shift();
      }
    },
    
    // В функции addLogWithLevel:
    addLogWithLevel: (state, action: PayloadAction<{message: string, level: 'debug' | 'info' | 'warning' | 'error'}>) => {
        const { message, level } = action.payload;
        
        // ВАЖНО: Проверяем и очищаем сообщение
        if (!message) {
            console.warn('Пустое сообщение лога');
            return;
        }
        
        // Убираем лишние кавычки и пробелы
        let cleanMessage = message.trim();
        
        // Убираем окружающие кавычки
        if ((cleanMessage.startsWith('"') && cleanMessage.endsWith('"')) ||
            (cleanMessage.startsWith("'") && cleanMessage.endsWith("'"))) {
            cleanMessage = cleanMessage.substring(1, cleanMessage.length - 1);
        }
        
        // Проверяем после очистки
        if (!cleanMessage || cleanMessage === '' || cleanMessage === '""' || cleanMessage === "''") {
            console.warn('Сообщение стало пустым после очистки:', { original: message });
            return;
        }
        
        // Если сообщение - JSON строка, пытаемся извлечь текст
        if (cleanMessage.startsWith('{') && cleanMessage.endsWith('}')) {
            try {
                const parsed = JSON.parse(cleanMessage);
                if (parsed.message) {
                    cleanMessage = parsed.message;
                } else if (parsed.log) {
                    cleanMessage = parsed.log;
                }
            } catch {
                // Не JSON, оставляем как есть
            }
        }
        
        const timestamp = new Date().toISOString();
        let logEntry = cleanMessage;
        
        // Если сообщение уже содержит timestamp, не добавляем новый
        if (!cleanMessage.includes(timestamp.substring(0, 10))) {
            logEntry = `[${timestamp}] ${cleanMessage}`;
        }
        
        state.logs.push(logEntry);
        
        // Ограничиваем размер
        if (state.logs.length > 10000) {
            state.logs = state.logs.slice(-5000);
        }
        
        // Добавляем в соответствующие категории
        if (level === 'error') {
            state.errors.push(logEntry);
            if (state.errors.length > 1000) {
                state.errors = state.errors.slice(-500);
            }
        } else if (level === 'warning') {
            state.warnings.push(logEntry);
            if (state.warnings.length > 1000) {
                state.warnings = state.warnings.slice(-500);
            }
        }
        
        // Автоматически обновляем прогресс если есть в сообщении
        const progressMatch = cleanMessage.match(/(\d+(\.\d+)?)%/);
        if (progressMatch) {
            const progressStr = progressMatch[1];
            if (progressStr !== undefined) {
              const progress = parseFloat(progressStr);
              if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                  state.progress = progress;
              }
            }
        }
    },
    
    setLogs: (state, action: PayloadAction<string[]>) => {
      state.logs = action.payload;
    },
    
    clearLogs: (state) => {
      state.logs = [];
    },
    
    setLogLevel: (state, action: PayloadAction<'all' | 'debug' | 'info' | 'warning' | 'error'>) => {
      state.logLevel = action.payload;
    },
    
    setAutoScrollLogs: (state, action: PayloadAction<boolean>) => {
      state.autoScrollLogs = action.payload;
    },
    
    // === Конфигурация тренировки ===
    updateConfig: (state, action: PayloadAction<Partial<FinetuneState['config']>>) => {
      state.config = { ...state.config, ...action.payload };
    },
    
    setConfig: (state, action: PayloadAction<FinetuneState['config']>) => {
      state.config = action.payload;
    },
    
    resetConfig: (state) => {
      state.config = getBaseConfig();
    },
    
    // === Данные для тренировки ===
    setDataset: (state, action: PayloadAction<File | null>) => {
      state.dataset = action.payload;
      state.isDatasetLoaded = !!action.payload;
    },
    
    setDatasetInfo: (state, action: PayloadAction<DatasetInfo | null>) => {
      state.datasetInfo = action.payload;
    },
    
    updateDatasetStats: (state, action: PayloadAction<Partial<FinetuneState['datasetStats']>>) => {
      state.datasetStats = { ...state.datasetStats, ...action.payload };
    },
    
    // === GPU и системные ресурсы ===
    updateGpuStats: (state, action: PayloadAction<Record<string, number>>) => {
      for (const [key, used] of Object.entries(action.payload)) {
        if (!isGpuKey(key) || typeof used !== 'number') continue;
        const existing = state.gpuStats[key];
        if (!existing) continue;
        existing.used = used;
        const total = existing.total || 24;
        existing.percentage = Math.round((used / total) * 100);
      }
    },
    
    setGpuStatsReal: (state, action: PayloadAction<Record<string, Partial<GpuStat>>>) => {
      for (const [key, stat] of Object.entries(action.payload)) {
        if (!isGpuKey(key) || !stat) continue;
        state.gpuStats[key] = {
          ...(state.gpuStats[key] ?? {
            used: 0,
            total: 24,
            percentage: 0,
            temperature: 0,
            utilization: 0,
            powerDraw: 0,
            memoryClock: 0,
            graphicsClock: 0,
            fanSpeed: 0,
            name: 'Detecting...',
            uuid: '',
            index: Number.parseInt(key.replace('gpu', ''), 10),
          }),
          ...stat,
          index: Number.parseInt(key.replace('gpu', ''), 10),
        };
      }
    },
    
    setSystemStats: (state, action: PayloadAction<Partial<FinetuneState['systemStats']>>) => {
      state.systemStats = { ...state.systemStats, ...action.payload };
    },
    
    // === Управление сессиями ===
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },
    
    setCurrentSession: (state, action: PayloadAction<FinetuneSession | null>) => {
      state.currentSession = action.payload;
      
      if (action.payload) {
        const sessionStatus = action.payload.status;
        state.isTraining = sessionStatus === 'running';
        
        if (action.payload.progress !== undefined) {
          state.progress = action.payload.progress;
        }
        
        state.recentSessions = [
          action.payload,
          ...state.recentSessions.filter(s => s.sessionId !== action.payload?.sessionId)
        ].slice(0, 50);
      } else {
        state.isTraining = false;
        state.progress = 0;
      }
    },

    updateSessionStatus: (
      state,
      action: PayloadAction<{ status: FinetuneSession['status']; progress?: number }>
    ) => {
      const { status, progress } = action.payload;
      if (state.currentSession) {
        state.currentSession.status = status;
        if (progress !== undefined) {
          state.currentSession.progress = progress;
        }
      }
      if (progress !== undefined) {
        state.progress = Math.min(100, Math.max(0, progress));
      }
      state.isTraining = status === 'running' || status === 'pending';
    },
    
    removeSessionFromHistory: (state, action: PayloadAction<string>) => {
      state.recentSessions = state.recentSessions.filter(s => s.sessionId !== action.payload);
    },
    
    setSessions: (state, action: PayloadAction<FinetuneSession[]>) => {
      state.sessions = action.payload;
    },
    
    addSession: (state, action: PayloadAction<FinetuneSession>) => {
      state.sessions.push(action.payload);
    },
    
    removeSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.sessionId !== action.payload);
      state.recentSessions = state.recentSessions.filter(s => s.sessionId !== action.payload);
      if (state.sessionId === action.payload) {
        state.sessionId = null;
        state.currentSession = null;
        state.isTraining = false;
        localStorage.removeItem(STORAGE_KEYS.STATE);
      }
    },
    
    setSelectedSessionId: (state, action: PayloadAction<string | null>) => {
      state.selectedSessionId = action.payload;
    },
    
    // === Состояние вебсокета ===
    setWebsocketConnected: (state, action: PayloadAction<boolean>) => {
      state.websocketConnected = action.payload;
    },
    
    setWebsocketReconnecting: (state, action: PayloadAction<boolean>) => {
      state.websocketReconnecting = action.payload;
    },
    
    setLastWebsocketMessage: (state, action: PayloadAction<WebSocketMessage | null>) => {
      state.lastWebsocketMessage = action.payload;
    },
    
    // === История тренировок ===
    addToTrainingHistory: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.trainingHistory.push(action.payload);
      if (state.trainingHistory.length > 100) {
        state.trainingHistory.shift();
      }
    },
    
    clearTrainingHistory: (state) => {
      state.trainingHistory = [];
    },
    
    // === Ошибки и предупреждения ===
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [ERROR] ${action.payload}`;
        state.logs.push(logEntry);
        state.errors.push(logEntry);
      }
    },
    
    addWarning: (state, action: PayloadAction<string>) => {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [WARNING] ${action.payload}`;
      state.warnings.push(logEntry);
      state.logs.push(logEntry);
    },
    
    clearWarnings: (state) => {
      state.warnings = [];
    },
    
    clearErrors: (state) => {
      state.errors = [];
      state.error = null;
    },
    
    // === Состояние UI ===
    setActiveTab: (state, action: PayloadAction<'train' | 'sessions' | 'models' | 'datasets' | 'settings'>) => {
      state.uiState.activeTab = action.payload;
    },
    
    toggleExpandedPanel: (state, action: PayloadAction<keyof FinetuneState['uiState']['expandedPanels']>) => {
      state.uiState.expandedPanels[action.payload] = !state.uiState.expandedPanels[action.payload];
    },
    
    setExpandedPanel: (state, action: PayloadAction<{panel: keyof FinetuneState['uiState']['expandedPanels'], expanded: boolean}>) => {
      state.uiState.expandedPanels[action.payload.panel] = action.payload.expanded;
    },
    
    setShowAdvancedSettings: (state, action: PayloadAction<boolean>) => {
      state.uiState.showAdvancedSettings = action.payload;
    },
    
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.uiState.darkMode = action.payload;
    },
    
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.uiState.autoRefresh = action.payload;
    },
    
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.uiState.refreshInterval = action.payload;
    },
    
    // === Параметры экспорта и сохранения ===
    updateExportOptions: (state, action: PayloadAction<Partial<FinetuneState['exportOptions']>>) => {
      state.exportOptions = { ...state.exportOptions, ...action.payload };
    },
    
    setIsExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
    },
    
    setIsImporting: (state, action: PayloadAction<boolean>) => {
      state.isImporting = action.payload;
    },
    
    // === Параметры валидации ===
    setValidationResults: (state, action: PayloadAction<unknown | null>) => {
      state.validationResults = action.payload;
    },
    
    setEvaluationMetrics: (state, action: PayloadAction<unknown | null>) => {
      state.evaluationMetrics = action.payload;
    },
    
    // === Флаги состояния ===
    setIsInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    
    setIsDatasetLoaded: (state, action: PayloadAction<boolean>) => {
      state.isDatasetLoaded = action.payload;
    },
    
    setIsConfigValid: (state, action: PayloadAction<boolean>) => {
      state.isConfigValid = action.payload;
    },
    
    // === Общие сбросы ===
    resetProgress: (state) => {
      state.progress = 0;
      state.currentEpoch = 0;
      state.currentStep = 0;
      state.metrics = getBaseInitialState().metrics;
    },
    
    resetTraining: (state) => {
      state.isTraining = false;
      state.isStarting = false;
      state.isStopping = false;
      state.isPendingOperation = false;
      state.progress = 0;
      state.currentEpoch = 0;
      state.currentStep = 0;
      state.metrics = getBaseInitialState().metrics;
      state.sessionId = null;
      state.currentSession = null;
      state.error = null;
      state.websocketConnected = false;
      localStorage.removeItem(STORAGE_KEYS.STATE);
    },
    
    resetAll: () => {
      return getBaseInitialState();
    },
    
    // === Сохранение состояния ===
    saveStateToStorage: (state) => {
      saveState(state);
    },
    
    loadStateFromStorage: (state) => {
      const saved = loadState();
      if (saved.sessionId) state.sessionId = saved.sessionId;
      if (saved.config) state.config = { ...state.config, ...saved.config };
      if (saved.isTraining !== undefined) state.isTraining = saved.isTraining;
      if (saved.progress !== undefined) state.progress = saved.progress;
      if (saved.currentSession) state.currentSession = saved.currentSession;
      if (saved.logs) state.logs = saved.logs;
      if (saved.recentSessions) state.recentSessions = saved.recentSessions;
      if (saved.trainingHistory) state.trainingHistory = saved.trainingHistory;
      if (saved.errors) state.errors = saved.errors;
      if (saved.warnings) state.warnings = saved.warnings;
      if (saved.logLevel) state.logLevel = saved.logLevel;
    },
    
    // === Синхронизация состояния (новый экшен) ===
    syncTrainingState: (state) => {
      if (state.currentSession) {
        const sessionStatus = state.currentSession.status;
        const shouldBeTraining = sessionStatus === 'running';
        
        if (state.isTraining !== shouldBeTraining) {
          state.isTraining = shouldBeTraining;
        }
        
        if (state.currentSession.progress !== undefined && 
            state.progress !== state.currentSession.progress) {
          state.progress = state.currentSession.progress;
        }
      } else if (state.isTraining) {
        state.isTraining = false;
      }
    }
  }
});

export const finetunePersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  const saveActions = [
    'finetune/setTrainingStatus',
    'finetune/setSessionId',
    'finetune/setCurrentSession',
    'finetune/updateSessionStatus',
    'finetune/updateProgress',
    'finetune/addLog',
    'finetune/addLogWithLevel',
    'finetune/updateConfig',
    'finetune/updateEpoch',
    'finetune/updateStep',
    'finetune/updateMetrics',
    'finetune/setError',
    'finetune/addWarning',
    'finetune/setLogLevel'
  ];
  
  if (typeof action === 'object' && action !== null && 'type' in action && saveActions.includes(String(action.type))) {
    const state = (store.getState() as { finetune: FinetuneState }).finetune;
    saveState(state);
  }
  
  return result;
};

export const {
  setTrainingStatus,
  setStartingStatus,
  setStoppingStatus,
  setPendingOperation,
  updateProgress,
  updateEpoch,
  updateStep,
  updateMetrics,
  addLog,
  addLogWithLevel,
  setLogs,
  clearLogs,
  setLogLevel,
  setAutoScrollLogs,
  updateConfig,
  setConfig,
  resetConfig,
  setDataset,
  setDatasetInfo,
  updateDatasetStats,
  updateGpuStats,
  setGpuStatsReal,
  setSystemStats,
  setSessionId,
  setCurrentSession,
  updateSessionStatus,
  removeSessionFromHistory,
  setSessions,
  addSession,
  removeSession,
  setSelectedSessionId,
  setWebsocketConnected,
  setWebsocketReconnecting,
  setLastWebsocketMessage,
  addToTrainingHistory,
  clearTrainingHistory,
  setError,
  addWarning,
  clearWarnings,
  clearErrors,
  setActiveTab,
  toggleExpandedPanel,
  setExpandedPanel,
  setShowAdvancedSettings,
  setDarkMode,
  setAutoRefresh,
  setRefreshInterval,
  updateExportOptions,
  setIsExporting,
  setIsImporting,
  setValidationResults,
  setEvaluationMetrics,
  setIsInitialized,
  setIsDatasetLoaded,
  setIsConfigValid,
  resetProgress,
  resetTraining,
  resetAll,
  saveStateToStorage,
  loadStateFromStorage,
  syncTrainingState
} = finetuneSlice.actions;

export default finetuneSlice.reducer;