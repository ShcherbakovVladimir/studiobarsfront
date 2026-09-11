// /home/user/projects/studioxlam/src/services/finetuneService.ts
import { normalizeGpuBundle as extractGpuBundle } from '../utils/gpuUtils';
import {
  setTrainingStatus,
  setStartingStatus,
  setStoppingStatus,
  setPendingOperation,
  addLog,
  addLogWithLevel,
  updateProgress,
  updateEpoch,
  updateStep,
  updateMetrics,
  setGpuStatsReal,
  setSessionId,
  setCurrentSession,
  setWebsocketConnected,
  setWebsocketReconnecting,
  setError,
  setSystemStats,
  updateDatasetStats,
  removeSessionFromHistory,
  saveStateToStorage  // ✅ ИМПОРТ ДОБАВЛЕН!
} from '../store/finetuneSlice';
import type { 
  FinetuneConfig, 
  FinetuneSession, 
  GpuStat, 
  SystemStats, 
  DatasetStats,
  GpuStatsBundle,
  ApiResponse,
  ExportOptions,
  UnknownRecord
} from '../types';
import { buildAuthHeaders, buildChatApiUrl, getChatApiBase } from './apiClient';
import { formatErrorMessage } from '../utils/errorUtils';
import { getWebSocketUrl } from '../utils/wsUtils';
import { logInfo, logSuccess, logWarning, logError } from '../utils/logging';
import { store } from '../store/store';

// Конфигурация WebSocket
const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 3000,
  CONNECT_TIMEOUT: 10000
} as const;

// Специализированные типы для ответов API
interface StartTrainingResponse extends ApiResponse {
  sessionId?: string;
  details?: {
    websocketUrl?: string;
  };
}

interface StatusResponse extends ApiResponse {
  sessionId?: string;
  status?: FinetuneSession['status'];
  progress?: number;
  details?: {
    config?: FinetuneConfig;
    startTime?: string;
    endTime?: string;
    exitCode?: number;
    error?: string;
  };
  logs?: string[];
  gpuStats?: GpuStatsBundle;
}

interface GpuStatsResponse extends ApiResponse {
  stats?: GpuStatsBundle;
}

interface SystemStatsResponse extends ApiResponse {
  stats?: SystemStats;
  system?: UnknownRecord;
}

interface DatasetAnalysisResponse extends ApiResponse {
  stats?: DatasetStats;
}

interface SessionsResponse extends ApiResponse {
  sessions?: FinetuneSession[];
}

interface LogsResponse extends ApiResponse {
  logs?: string[];
}

interface ExportResponse extends ApiResponse {
  message?: string;
}

interface ConfigValidationResponse extends ApiResponse {
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
}

interface ModelInfoResponse extends ApiResponse {
  model?: UnknownRecord;
}

// WebSocket для реального мониторинга
let ws: WebSocket | null = null;
let currentSessionId: string | null = null;
let reconnectAttempts = 0;

// Словарь для отслеживания активных запросов
const activeRequests = new Map<string, AbortController>();

// Утилита для создания безопасного fetch с таймаутом
const safeFetch = async <T = unknown>(
  path: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<{ response: Response; data: T }> => {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = Date.now().toString();
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  activeRequests.set(id, controller);
  
  try {
    const url = path.startsWith('http')
      ? path
      : buildChatApiUrl(path.startsWith('/') ? path : `/${path}`);
    const headers = buildAuthHeaders(fetchOptions.headers);
    if (fetchOptions.body instanceof FormData) {
      headers.delete('Content-Type');
    }
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    
    const data: T = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timeoutId);
    activeRequests.delete(id);
  }
};

// Отмена всех активных запросов
const abortAllRequests = () => {
  activeRequests.forEach(controller => controller.abort());
  activeRequests.clear();
};

// Генерация sessionId
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `finetune_${timestamp}_${random}`;
};

const getRecordNumber = (record: UnknownRecord, key: string, fallback = 0): number => {
  const value = record[key];
  return typeof value === 'number' ? value : fallback;
};

const getRecordString = (record: UnknownRecord, key: string, fallback = ''): string => {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
};

// Функция для нормализации данных GPU из API
const normalizeGpuStats = (gpuData: UnknownRecord | GpuStat | null | undefined): GpuStat => {
  if (!gpuData) {
    return {
      used: 0,
      total: 24,
      percentage: 0,
      temperature: 0,
      utilization: 0,
      powerDraw: 0,
      memoryClock: 0,
      graphicsClock: 0,
      fanSpeed: 0,
      name: 'GPU Not Detected',
      uuid: '',
      index: 0
    };
  }

  const data = gpuData as UnknownRecord;
  const usedMb = getRecordNumber(data, 'used_mb');
  const totalMb = getRecordNumber(data, 'total_mb');
  const used = getRecordNumber(data, 'used') || (usedMb ? usedMb / 1024 : 0);
  const total = getRecordNumber(data, 'total') || (totalMb ? totalMb / 1024 : 24);

  return {
    used,
    total,
    percentage: getRecordNumber(data, 'percentage') || Math.round((used / total) * 100) || 0,
    temperature: getRecordNumber(data, 'temperature'),
    utilization: getRecordNumber(data, 'utilization'),
    powerDraw: getRecordNumber(data, 'power') || getRecordNumber(data, 'powerDraw'),
    fanSpeed: getRecordNumber(data, 'fan') || getRecordNumber(data, 'fanSpeed'),
    memoryClock: getRecordNumber(data, 'memory_clock') || getRecordNumber(data, 'memoryClock'),
    graphicsClock: getRecordNumber(data, 'core_clock') || getRecordNumber(data, 'graphicsClock'),
    name: getRecordString(data, 'name', 'NVIDIA GeForce RTX 3090'),
    uuid: getRecordString(data, 'uuid'),
    index: getRecordNumber(data, 'index')
  };
};

const normalizeGpuBundleFromApi = (
  bundle?: Record<string, unknown> | GpuStatsBundle | null
): Record<string, GpuStat> => {
  const extracted = extractGpuBundle(bundle as Record<string, unknown> | null);
  const result: Record<string, GpuStat> = {};

  for (const [key, value] of Object.entries(extracted)) {
    const normalized = normalizeGpuStats(value as UnknownRecord | GpuStat);
    normalized.index = Number.parseInt(key.replace('gpu', ''), 10);
    result[key] = normalized;
  }

  return result;
};

// Функция для нормализации системной статистики
const normalizeSystemStats = (apiData: UnknownRecord): SystemStats => {
  const systemData = (apiData.system ?? apiData.stats ?? {}) as UnknownRecord;
  
  return {
    cpuUsage: getRecordNumber(systemData, 'cpuUsage'),
    memoryUsage: getRecordNumber(systemData, 'memoryUsage'),
    diskUsage: getRecordNumber(systemData, 'diskUsage'),
    networkUsage: getRecordNumber(systemData, 'networkUsage') || (systemData.networkActive ? 0.1 : 0),
    uptime: getRecordNumber(systemData, 'uptimeSeconds') || getRecordNumber(systemData, 'uptime'),
    
    // Форматирование uptime для отображения
    uptimeFormatted: getRecordString(systemData, 'uptime') || formatUptimeSeconds(getRecordNumber(systemData, 'uptimeSeconds')) || '0h 0m',
    
    // Дополнительные поля из API
    totalMemory: getRecordString(systemData, 'totalMemory', '157 GB'),
    usedMemory: getRecordString(systemData, 'usedMemory', '7 GB'),
    freeMemory: getRecordString(systemData, 'freeMemory', '150 GB')
  };
};

// Вспомогательная функция для форматирования uptime
const formatUptimeSeconds = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const finetuneService = {
  /**
   * Запуск процесса дообучения
   */
  startTraining: async (config: FinetuneConfig, dataset: File | null): Promise<void> => {
    // ========== ПРОВЕРКА СОСТОЯНИЯ ==========
    const currentState = store.getState().finetune;
    
    // Проверяем, не выполняется ли уже операция
    if (currentState.isPendingOperation) {
        logWarning('⚠️ Операция уже выполняется');
        return;
    }
    
    // Проверяем, не запущено ли уже обучение
    if (currentState.isTraining) {
        logWarning('⚠️ Обучение уже запущено');
        return;
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ==========
    store.dispatch(setPendingOperation(true));
    store.dispatch(setStartingStatus(true));
    store.dispatch(setError(null));
    
    // Сбрасываем прогресс перед запуском
    store.dispatch(updateProgress(0));
    store.dispatch(updateEpoch({ current: 0, total: config.epochs }));
    store.dispatch(updateStep({ current: 0, total: 0 }));
    
    try {
        // ========== ПРОВЕРКА ДАТАСЕТА ==========
        if (!dataset) {
            throw new Error('Датасет не загружен');
        }
        
        // ========== ГЕНЕРАЦИЯ SESSION ID ==========
        const sessionId = generateSessionId();
        
        // ✅ ВАЖНО: Сохраняем sessionId ДО отправки запроса
        store.dispatch(setSessionId(sessionId));
        currentSessionId = sessionId;
        
        logInfo('🚀 Запуск процесса дообучения...');
        logInfo(`📋 Session ID: ${sessionId}`);
        logInfo(`⚙️ Конфигурация: Модель=${config.modelName}, Epochs=${config.epochs}, LR=${config.learningRate}, Batch=${config.batchSize}, LoRA Rank=${config.loraRank}`);
        logInfo(`📁 Датасет: ${dataset.name} (${(dataset.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // ========== СОЗДАНИЕ СЕССИИ В СОСТОЯНИИ ==========
        const session: FinetuneSession = {
            sessionId,
            status: 'pending',
            progress: 0,
            config,
            startTime: new Date().toISOString(),
            logs: []
        };
        store.dispatch(setCurrentSession(session));
        
        // ✅ Отдельно устанавливаем метрики в store
        store.dispatch(updateMetrics({
            loss: 0,
            learningRate: config.learningRate,
            gradientNorm: 0,
            memoryUsage: 0,
            samplesPerSecond: 0,
            stepsPerSecond: 0
        }));
        
        // ========== ПОДГОТОВКА FORM DATA ==========
        const formData = new FormData();
        formData.append('config', JSON.stringify(config));
        formData.append('dataset', dataset);
        formData.append('sessionId', sessionId);
        
        console.group('🚀 startTraining - Отправка запроса');
        console.log('Session ID:', sessionId);
        console.log('Config:', config);
        console.log('Dataset:', dataset.name, dataset.size, 'bytes');
        console.log('API URL:', `${getChatApiBase()}/finetune/start`);
        console.groupEnd();
        
        // ========== ОТПРАВКА ЗАПРОСА ==========
        const { response, data: result } = await safeFetch<StartTrainingResponse>('/finetune/start', {
            method: 'POST',
            body: formData,
            timeout: 60000
        });
        
        console.group('📡 startTraining - Ответ сервера');
        console.log('Response status:', response.status, response.statusText);
        console.log('Result:', result);
        console.log('Result details:', result.details);
        console.log('WebSocket URL from server:', result.details?.websocketUrl);
        console.groupEnd();
        
        // ========== ОБРАБОТКА ОШИБОК ОТВЕТА ==========
        if (!response.ok) {
            throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
        }
        
        // ========== УСПЕШНЫЙ ЗАПУСК ==========
        if (result.success) {
            logSuccess('✅ Процесс дообучения успешно запущен');
            
            // ========== КРИТИЧЕСКИ ВАЖНО: УСТАНОВКА СОСТОЯНИЯ ==========
            
            // ✅ 1. Устанавливаем статус тренировки в TRUE
            //    Это ключевой момент - кнопка изменится на "Остановить"
            store.dispatch(setTrainingStatus(true));
            
            // ✅ 2. Сбрасываем флаги операций
            store.dispatch(setStartingStatus(false));
            store.dispatch(setPendingOperation(false));
            
            // ✅ 3. Обновляем статус сессии на 'running'
            const updatedSession: FinetuneSession = {
                ...session,
                status: 'running'
            };
            store.dispatch(setCurrentSession(updatedSession));
            
            // ========== НАСТРОЙКА WEBSOCKET ==========
            console.group('🔌 startTraining - Настройка WebSocket');
            
            // Получаем WebSocket URL от сервера (может быть неправильным)
            const serverWsUrl = result.details?.websocketUrl;
            console.log('WebSocket URL от сервера:', serverWsUrl);
            
            // ✅ ВСЕГДА используем нашу функцию для генерации правильного URL
            const correctWsUrl = getWebSocketUrl(sessionId);
            console.log('✅ Правильный WebSocket URL:', correctWsUrl);
            
            // Проверяем правильность URL
            const urlCheck = {
                containsPort3003: correctWsUrl.includes(':3003'),
                containsFinetuneWs: correctWsUrl.includes('/finetune-ws/'),
                endsWithCorrectPath: correctWsUrl.endsWith(`/finetune-ws/${sessionId}`),
                protocol: correctWsUrl.startsWith('wss:') ? 'WSS' : 'WS'
            };
            
            console.log('Проверка WebSocket URL:', urlCheck);
            
            if (urlCheck.containsPort3003) {
                console.warn('⚠️ WebSocket URL содержит порт 3003 - это может не работать через прокси');
            }
            
            if (!urlCheck.containsFinetuneWs) {
                console.error('❌ WebSocket URL не содержит /finetune-ws/ - это обязательно!');
            }
            
            console.groupEnd();
            
            // ========== ПОДКЛЮЧЕНИЕ WEBSOCKET ==========
            // Отключаем существующее соединение если есть
            disconnectWebSocket();
            
            // Небольшая задержка для стабильности
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Подключаем WebSocket
            console.log('🔌 Инициализация WebSocket подключения...');
            connectWebSocket(sessionId, correctWsUrl);
            
            // ========== ЗАПУСК ПОЛЛИНГА ==========
            // Запускаем периодическое обновление статуса (как fallback)
            startStatusPolling(sessionId);
            
            // ========== ЛОГИРОВАНИЕ ==========
            logInfo(`🔌 WebSocket: ${correctWsUrl}`);
            logInfo(`📊 Статус: ${getChatApiBase()}/finetune/status/${sessionId}`);
            
            // ========== СОХРАНЕНИЕ СОСТОЯНИЯ ==========
            // ✅ ИСПРАВЛЕНО: Используем правильный экшен
            try {
                store.dispatch(saveStateToStorage());
                console.log('💾 Состояние сохранено в localStorage');
            } catch (e) {
                console.warn('⚠️ Не удалось сохранить состояние:', e);
            }
            
            // ========== ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ==========
            // Проверяем, что состояние действительно обновилось
            setTimeout(() => {
                const stateAfterStart = store.getState().finetune;
                
                if (stateAfterStart.isTraining !== true) {
                    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: isTraining не обновился!');
                    console.log('Текущее состояние:', stateAfterStart.isTraining);
                    console.log('Принудительно устанавливаем isTraining = true');
                    store.dispatch(setTrainingStatus(true));
                }
                
                if (stateAfterStart.currentSession?.status !== 'running') {
                    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: статус сессии не running!');
                    console.log('Текущий статус:', stateAfterStart.currentSession?.status);
                    
                    const forceUpdate: FinetuneSession = {
                        ...stateAfterStart.currentSession!,
                        status: 'running'
                    };
                    store.dispatch(setCurrentSession(forceUpdate));
                }
                
                console.log('✅ Состояние после запуска:', {
                    isTraining: stateAfterStart.isTraining,
                    sessionStatus: stateAfterStart.currentSession?.status,
                    sessionId: stateAfterStart.sessionId,
                    progress: stateAfterStart.progress
                });
            }, 500);
            
        } else {
            // ========== ОШИБКА ЗАПУСКА ==========
            const errorMsg = result.error || result.message || 'Не удалось запустить обучение';
            logError(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        // ========== ОБРАБОТКА ОШИБОК ==========
        console.error('❌ startTraining - Ошибка запуска дообучения:', error);
        const errorMessage = formatErrorMessage(error, 'Ошибка запуска дообучения');
        
        // Детальное логирование ошибки
        console.group('❌ startTraining - Детали ошибки');
        console.error('Error:', error);
        console.error('Error message:', errorMessage);
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error stack:', error.stack);
        }
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('🌐 Ошибка сети: Не удалось连接到 сервер');
            console.error('   Проверьте:');
            console.error('   1. Запущен ли бэкенд на порту 3001');
            console.error('   2. Нет ли блокировки CORS');
            console.error('   3. Правильный ли chat API base:', getChatApiBase());
        }
        console.groupEnd();
        
        // Логируем ошибку пользователю
        logError(`❌ ${errorMessage}`);
        store.dispatch(setError(errorMessage));
        
        // ========== ОЧИСТКА СОСТОЯНИЯ ПРИ ОШИБКЕ ==========
        store.dispatch(setTrainingStatus(false));
        store.dispatch(setSessionId(null));
        store.dispatch(setCurrentSession(null));
        currentSessionId = null;
        
        // Отключаем WebSocket и поллинг
        disconnectWebSocket();
        stopStatusPolling();
        
        throw error;
        
    } finally {
        // ========== ФИНАЛЬНАЯ ОЧИСТКА ==========
        // Сбрасываем флаги операций если они еще активны
        const finalState = store.getState().finetune;
        
        if (finalState.isStarting) {
            store.dispatch(setStartingStatus(false));
        }
        
        if (finalState.isPendingOperation) {
            store.dispatch(setPendingOperation(false));
        }
        
        // ✅ ИСПРАВЛЕНО: Сохраняем состояние
        try {
            store.dispatch(saveStateToStorage());
            console.log('💾 Состояние сохранено в localStorage (finally)');
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить состояние:', e);
        }
        
        console.log('🏁 startTraining - Завершено');
    }
},
  
  /**
   * Остановка процесса дообучения
   */
  stopTraining: async (sessionId?: string): Promise<void> => {
    if (store.getState().finetune.isPendingOperation) {
      logWarning('Операция уже выполняется');
      return;
    }
    
    const state = store.getState().finetune;
    const targetSessionId = sessionId || state.sessionId;
    
    if (!targetSessionId) {
      throw new Error('Нет активной сессии для остановки');
    }
    
    store.dispatch(setPendingOperation(true));
    store.dispatch(setStoppingStatus(true));
    logInfo('Остановка процесса дообучения...');
    
    try {
      const { response, data: result } = await safeFetch<ApiResponse>('/finetune/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: targetSessionId }),
        timeout: 30000
      });
      
      if (!response.ok) {
        throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        logSuccess('Процесс дообучения остановлен');
        store.dispatch(setTrainingStatus(false));
        
        // Закрываем WebSocket
        disconnectWebSocket();
        
        // Останавливаем опрос статуса
        stopStatusPolling();
        
        // Обновляем текущую сессию
        if (targetSessionId === currentSessionId) {
          const updatedSession: FinetuneSession = {
            ...state.currentSession!,
            status: 'stopped',
            endTime: new Date().toISOString()
          };
          store.dispatch(setCurrentSession(updatedSession));
          
          store.dispatch(setSessionId(null));
          currentSessionId = null;
        }
        
        // ✅ Сохраняем состояние после остановки
        store.dispatch(saveStateToStorage());
      } else {
        throw new Error(result.error || result.message || 'Не удалось остановить обучение');
      }
      
    } catch (error) {
      console.error('Ошибка остановки дообучения:', error);
      const errorMessage = formatErrorMessage(error, 'Ошибка остановки дообучения');
      logError(errorMessage);
      throw error;
    } finally {
      store.dispatch(setStoppingStatus(false));
      store.dispatch(setPendingOperation(false));
    }
  },
  
  /**
   * Получение статуса процесса дообучения
   */
  getStatus: async (sessionId: string): Promise<FinetuneSession | null> => {
    try {
      // ✅ ВСЕГДА нормализуем sessionId перед запросом
      const fullSessionId = sessionId.startsWith('finetune_') 
        ? sessionId 
        : `finetune_${sessionId}`;
      
      let { response, data: result } = await safeFetch<StatusResponse>(
        `/finetune/status/${encodeURIComponent(fullSessionId)}`,
        { timeout: 10000 }
      );

      // Prefixed id 404 → try the original id once, without re-entering getStatus
      if (response.status === 404 && sessionId !== fullSessionId) {
        console.log(`🔄 Fallback to original sessionId: ${sessionId}`);
        const fallback = await safeFetch<StatusResponse>(
          `/finetune/status/${encodeURIComponent(sessionId)}`,
          { timeout: 10000 }
        );
        if (fallback.response.ok && fallback.data.success) {
          response = fallback.response;
          result = fallback.data;
        }
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          store.dispatch(removeSessionFromHistory(sessionId));
          if (sessionId !== fullSessionId) {
            store.dispatch(removeSessionFromHistory(fullSessionId));
          }
          return null;
        }
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (!result.success) {
        return null;
      }
      
      // Создаем базовый конфиг
      const defaultConfig: FinetuneConfig = {
        modelName: "unknown",
        baseModel: "",
        modelType: "llama",
        epochs: 1,
        batchSize: 1,
        learningRate: 0.0001,
        warmupSteps: 0,
        weightDecay: 0.0,
        gradientAccumulationSteps: 1,
        useLora: true,
        loraRank: 16,
        loraAlpha: 32,
        loraDropout: 0.1,
        targetModules: [],
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
      
      // Объединяем с конфигом из ответа
      const mergedConfig = {
        ...defaultConfig,
        ...(result.details?.config || {})
      } as FinetuneConfig;
      
      // Нормализуем данные GPU если они есть
      let normalizedGpuStats: Record<string, GpuStat> | undefined;
      if (result.gpuStats) {
        normalizedGpuStats = normalizeGpuBundleFromApi(result.gpuStats as Record<string, unknown>);
      }
      
      return {
        sessionId: result.sessionId || fullSessionId,
        status: (result.status as FinetuneSession['status']) || 'unknown',
        progress: result.progress || 0,
        config: mergedConfig,
        startTime: result.details?.startTime || new Date().toISOString(),
        endTime: result.details?.endTime,
        logs: result.logs || [],
        gpuStats: normalizedGpuStats,
        exitCode: result.details?.exitCode,
        error: result.details?.error
      };
      
    } catch (error) {
      console.error('❌ Ошибка получения статуса:', error);
      logWarning('Ошибка получения статуса');
      return null;
    }
  },
  
  /**
   * Получение статистики GPU
   */
  getGpuStats: async (): Promise<Record<string, GpuStat> | null> => {
    try {
      const { response, data: result } = await safeFetch<GpuStatsResponse>('/finetune/gpu-stats', {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        const source = (result.stats ?? result.gpu ?? {}) as Record<string, unknown>;
        const normalizedStats = normalizeGpuBundleFromApi(source);
        
        console.log('🎮 Normalized GPU stats for store:', normalizedStats);
        store.dispatch(setGpuStatsReal(normalizedStats));
        return normalizedStats;
      } else {
        throw new Error(result.error || result.message || 'Не удалось получить статистику GPU');
      }
      
    } catch (error) {
      console.error('Ошибка получения статистики GPU:', error);
      return null;
    }
  },
  
  /**
   * Получение системной статистики
   */
  getSystemStats: async (): Promise<SystemStats | null> => {
    try {
      const { response, data: result } = await safeFetch<SystemStatsResponse>('/finetune/system-stats', {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        const systemStats = normalizeSystemStats(result as unknown as UnknownRecord);
        
        console.log('💻 System stats from API:', {
          raw: result,
          normalized: systemStats
        });
        
        store.dispatch(setSystemStats(systemStats));
        return systemStats;
      } else {
        throw new Error(result.error || result.message || 'Не удалось получить системную статистику');
      }
      
    } catch (error) {
      console.error('Ошибка получения системной статистики:', error);
      return null;
    }
  },
  
  /**
   * Получение полной статистики мониторинга
   */
  getFullMonitoringStats: async (): Promise<UnknownRecord | null> => {
    try {
      const { response, data: result } = await safeFetch<UnknownRecord>('/monitoring/full', {
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        console.log('📊 Full monitoring stats:', result);
        
        // Обновляем GPU статистику
        if (result.gpu && typeof result.gpu === 'object') {
          const normalizedGpuStats = normalizeGpuBundleFromApi(result.gpu as Record<string, unknown>);
          store.dispatch(setGpuStatsReal(normalizedGpuStats));
        }
        
        // Обновляем системную статистику
        if (result.system) {
          const systemStats = normalizeSystemStats(result);
          store.dispatch(setSystemStats(systemStats));
        }
        
        return result;
      } else {
        throw new Error(String(result.error || result.message || 'Не удалось получить полную статистику'));
      }
      
    } catch (error) {
      console.error('Ошибка получения полной статистики:', error);
      return null;
    }
  },
  
  /**
   * Анализ датасета
   */
  analyzeDataset: async (dataset: File): Promise<DatasetStats> => {
    try {
      const formData = new FormData();
      formData.append('dataset', dataset);
      
      const { response, data: result } = await safeFetch<DatasetAnalysisResponse>('/finetune/analyze-dataset', {
        method: 'POST',
        body: formData,
        timeout: 60000
      });
      
      if (!response.ok) {
        throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
      }
      
      if (result.success && result.stats) {
        const datasetStats: DatasetStats = {
          totalExamples: result.stats.totalExamples || 0,
          trainExamples: result.stats.trainExamples || 0,
          validationExamples: result.stats.validationExamples || 0,
          avgTokensPerExample: result.stats.avgTokensPerExample || 0,
          totalTokens: result.stats.totalTokens || 0
        };
        store.dispatch(updateDatasetStats(datasetStats));
        return datasetStats;
      } else {
        throw new Error(result.error || result.message || 'Не удалось проанализировать датасет');
      }
      
    } catch (error) {
      console.error('Ошибка анализа датасета:', error);
      throw error;
    }
  },
  
  /**
   * Получение списка сессий
   */
  getSessions: async (): Promise<FinetuneSession[]> => {
    try {
      const { response, data: result } = await safeFetch<SessionsResponse>('/finetune/sessions', {
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        return result.sessions || [];
      } else {
        throw new Error(result.error || result.message || 'Не удалось получить список сессий');
      }
      
    } catch (error) {
      console.error('Ошибка получения списка сессий:', error);
      return [];
    }
  },
  
  /**
   * Удаление сессии
   */
  deleteSession: async (sessionId: string): Promise<boolean> => {
    try {
      const { response, data: result } = await safeFetch<ApiResponse>(`/finetune/session/${sessionId}`, {
        method: 'DELETE',
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        logInfo(`Сессия ${sessionId} удалена`);
        return true;
      } else {
        throw new Error(result.error || result.message || 'Не удалось удалить сессию');
      }
      
    } catch (error) {
      console.error('Ошибка удаления сессии:', error);
      logError('Ошибка удаления сессии');
      return false;
    }
  },
  
  /**
   * Получение логов сессии
   */
  getLogs: async (sessionId: string, limit: number = 100, offset: number = 0): Promise<string[]> => {
    try {
      const { response, data: result } = await safeFetch<LogsResponse>(
        `/finetune/logs/${sessionId}?limit=${limit}&offset=${offset}`,
        { timeout: 10000 }
      );
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        return result.logs || [];
      } else {
        throw new Error(result.error || result.message || 'Не удалось получить логи');
      }
      
    } catch (error) {
      console.error('Ошибка получения логов:', error);
      return [];
    }
  },
  
  /**
   * Экспорт модели
   */
  exportModel: async (sessionId: string, options: ExportOptions): Promise<boolean> => {
    try {
      const { response, data: result } = await safeFetch<ExportResponse>(`/finetune/export/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
        timeout: 300000 // 5 минут для экспорта
      });
      
      if (!response.ok) {
        throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
      }
      
      if (result.success) {
        store.dispatch(addLog(`[${new Date().toISOString()}] Модель успешно экспортирована`));
        return true;
      } else {
        throw new Error(result.error || result.message || 'Не удалось экспортировать модель');
      }
      
    } catch (error) {
      console.error('Ошибка экспорта модели:', error);
      logError('Ошибка экспорта модели');
      return false;
    }
  },
  
  /**
   * Валидация конфигурации
   */
  validateConfig: async (config: FinetuneConfig): Promise<{valid: boolean, errors: string[], warnings: string[]}> => {
    try {
      const { response, data: result } = await safeFetch<ConfigValidationResponse>('/finetune/validate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      return {
        valid: result.valid || false,
        errors: result.errors || [],
        warnings: result.warnings || []
      };
      
    } catch (error) {
      console.error('Ошибка валидации конфигурации:', error);
      return {
        valid: false,
        errors: [formatErrorMessage(error, 'Ошибка валидации конфигурации')],
        warnings: []
      };
    }
  },
  
  /**
   * Получение информации о модели
   */
  getModelInfo: async (modelName: string): Promise<UnknownRecord | null> => {
    try {
      const { response, data: result } = await safeFetch<ModelInfoResponse>(
        `/finetune/model-info?modelName=${encodeURIComponent(modelName)}`,
        { timeout: 10000 }
      );
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      return (result.model as UnknownRecord | undefined) ?? (result as unknown as UnknownRecord);
      
    } catch (error) {
      console.error('Ошибка получения информации о модели:', error);
      return null;
    }
  },
  
  /**
   * Обновление всей статистики
   */
  refreshAllStats: async (): Promise<void> => {
    try {
      await Promise.all([
        finetuneService.getGpuStats(),
        finetuneService.getSystemStats()
      ]);
    } catch (error) {
      console.error('Ошибка обновления статистики:', error);
    }
  },
  
  /**
   * Отмена всех операций
   */
  abortAll: () => {
    abortAllRequests();
    disconnectWebSocket();
    stopStatusPolling();
  }
};

// WebSocket функции
const handleWebSocketMessage = (event: MessageEvent) => {
  try {
    const rawData = event.data;
    console.log('📨 WebSocket RAW event.data:', rawData);
    console.log('📨 WebSocket event type:', event.type);
    
    const data = JSON.parse(rawData);
    console.log('📨 WebSocket parsed message:', {
      type: data.type,
      hasMessage: !!data.message,
      messagePreview: typeof data.message === 'string' ? data.message.substring(0, 200) : data.message,
      rawData: rawData,
      timestamp: new Date().toISOString()
    });
    
    // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавляем базовую обработку ВСЕХ сообщений
    switch (data.type) {
      case 'log': {
        // 🔧 УМНАЯ ОБРАБОТКА ЛОГОВ: Автоматически определяем уровень лога
        const message = typeof data.message === 'string' ? data.message : JSON.stringify(data.message || '');
        
        console.log('📝 Adding WebSocket log to store:', {
          message: message,
          level: data.level || 'info',
          type: data.type,
          length: message.length
        });
        
        // Определяем уровень по содержимому сообщения
        let logLevel: 'debug' | 'info' | 'warning' | 'error' = 'info';
        
        // Проверяем на конкретные шаблоны
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('[error]') || 
            /error:/i.test(message) || 
            /❌|🚫|⛔/i.test(message) ||
            /failed|failure|exception|critical/i.test(message)) {
          logLevel = 'error';
          console.log('🔴 Detected ERROR level');
        } else if (lowerMessage.includes('[warning]') || 
                  /warning:/i.test(message) || 
                  /⚠️|⚠/i.test(message) ||
                  /warn:/i.test(message)) {
          logLevel = 'warning';
          console.log('🟡 Detected WARNING level');
        } else if (lowerMessage.includes('[debug]') || 
                  /debug:/i.test(message) || 
                  /🔍|🐛/i.test(message)) {
          logLevel = 'debug';
          console.log('🟣 Detected DEBUG level');
        } else if (lowerMessage.includes('[info]') || 
                  /info:/i.test(message) || 
                  /ℹ️|📝/i.test(message) ||
                  /\d+%/i.test(message) || // Процент прогресса
                  /progress:/i.test(message) || 
                  /epoch:/i.test(message) ||
                  /step:/i.test(message) ||
                  /eta:/i.test(message) ||
                  /loss:/i.test(message) ||
                  /learning_rate:/i.test(message) ||
                  /✅|✔️|✓/i.test(message)) { // Успешные операции
          logLevel = 'info';
          console.log('🔵 Detected INFO level');
        }
        
        // Переопределяем если в данных есть явный уровень
        if (data.level && ['debug', 'info', 'warning', 'error'].includes(data.level)) {
          logLevel = data.level as 'debug' | 'info' | 'warning' | 'error';
          console.log(`🎯 Using explicit log level: ${data.level}`);
        }
        
        console.log('📝 Final log processing:', { 
          originalLevel: data.level, 
          finalLevel: logLevel, 
          messagePreview: message.substring(0, 200),
          hasEmoji: /(?:✅|❌|⚠|🔍|ℹ|📈|📊)/u.test(message)
        });
        
        // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда добавляем лог в store
        // Используем addLog вместо addLogWithLevel для простоты
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${logLevel.toUpperCase()}] ${message}`;
        
        console.log('💾 Dispatching log to store:', {
          logEntry: logEntry.substring(0, 100),
          length: logEntry.length
        });
        
        // Добавляем лог в store
        store.dispatch(addLog(logEntry));
        
        // Также добавляем в errors/warnings если нужно
        if (logLevel === 'error') {
          store.dispatch(setError(message));
        }
        
        // 🔧 АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ПРОГРЕССА ИЗ ЛОГОВ
        // Ищем процент прогресса в сообщении
        const progressMatch = message.match(/(\d+\.?\d*)%/);
        if (progressMatch && progressMatch[1]) {
          const progressValue = parseFloat(progressMatch[1]);
          if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
            console.log(`📊 Extracted progress from log: ${progressValue}%`);
            store.dispatch(updateProgress(progressValue));
            
            // Обновляем прогресс в текущей сессии
            const state = store.getState().finetune;
            if (state.currentSession) {
              const updatedSession: FinetuneSession = {
                ...state.currentSession,
                progress: progressValue
              };
              store.dispatch(setCurrentSession(updatedSession));
            }
          }
        }
        
        // 🔧 ИЗВЛЕЧЕНИЕ МЕТРИК ИЗ ЛОГОВ
        // Пример лога: "loss: 0.0974 | grad_norm: 0.3959 | learning_rate: 0.0000"
        const metricsMatch = message.match(/loss:\s*([\d.]+).*?grad_norm:\s*([\d.]+).*?learning_rate:\s*([\d.e-]+)/i);
        if (metricsMatch) {
          const metricsUpdate = {
            loss: parseFloat(metricsMatch[1]) || 0,
            gradientNorm: parseFloat(metricsMatch[2]) || 0,
            learningRate: parseFloat(metricsMatch[3]) || 0
          };
          console.log('📈 Extracted metrics from log:', metricsUpdate);
          store.dispatch(updateMetrics(metricsUpdate));
        }
        
        // Извлекаем информацию об эпохах и шагах
        const epochMatch = message.match(/epoch:\s*([\d.]+)\s*\/?\s*([\d.]+)?/i);
        if (epochMatch) {
          const epochUpdate = {
            current: parseFloat(epochMatch[1]) || 0,
            total: epochMatch[2] ? parseFloat(epochMatch[2]) : (store.getState().finetune.totalEpochs || 0)
          };
          console.log('🔄 Extracted epoch from log:', epochUpdate);
          store.dispatch(updateEpoch(epochUpdate));
        }
        
        const stepMatch = message.match(/step:\s*(\d+)\s*\/?\s*(\d+)?/i);
        if (stepMatch) {
          const stepUpdate = {
            current: parseInt(stepMatch[1], 10) || 0,
            total: stepMatch[2] ? parseInt(stepMatch[2], 10) : (store.getState().finetune.totalSteps || 0)
          };
          console.log('👣 Extracted step from log:', stepUpdate);
          store.dispatch(updateStep(stepUpdate));
        }
        
        // Обработка явных данных из WebSocket
        if (data.progress !== undefined && typeof data.progress === 'number') {
          console.log('📊 Explicit progress from WebSocket:', data.progress);
          store.dispatch(updateProgress(data.progress));
        }
        
        if (data.metrics && typeof data.metrics === 'object') {
          console.log('📈 Explicit metrics from WebSocket:', data.metrics);
          store.dispatch(updateMetrics(data.metrics));
        }
        
        if (data.epoch && typeof data.epoch === 'object') {
          console.log('🔄 Explicit epoch from WebSocket:', data.epoch);
          store.dispatch(updateEpoch({
            current: data.epoch.current || 0,
            total: data.epoch.total || 0
          }));
        }
        
        if (data.step && typeof data.step === 'object') {
          console.log('👣 Explicit step from WebSocket:', data.step);
          store.dispatch(updateStep({
            current: data.step.current || 0,
            total: data.step.total || 0
          }));
        }
        break;
      }
        
      case 'status':
        console.log('🔔 Status update from WebSocket:', {
          status: data.status,
          progress: data.progress,
          error: data.error,
          endTime: data.endTime
        });
        
        if (data.status) {
          const state = store.getState().finetune;
          const currentSession = state.currentSession;
          
          // Обновляем текущую сессию
          if (currentSession) {
            const updatedSession: FinetuneSession = {
              ...currentSession,
              status: data.status,
              progress: data.progress !== undefined ? data.progress : currentSession.progress,
              endTime: (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') 
                ? (data.endTime || new Date().toISOString())
                : currentSession.endTime,
              error: data.error || currentSession.error
            };
            console.log('💾 Updating session in store:', updatedSession);
            store.dispatch(setCurrentSession(updatedSession));
          }
          
          // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Синхронизируем isTraining со статусом
          const shouldBeTraining = data.status === 'running';
          
          if (state.isTraining !== shouldBeTraining) {
            console.log(`🔄 Syncing training status: ${state.isTraining} -> ${shouldBeTraining} (session status: ${data.status})`);
            store.dispatch(setTrainingStatus(shouldBeTraining));
          }
          
          // Обновляем прогресс если есть
          if (data.progress !== undefined && typeof data.progress === 'number') {
            console.log('📊 Status update includes progress:', data.progress);
            store.dispatch(updateProgress(data.progress));
          }
          
          // Логируем изменение статуса
          store.dispatch(addLog(`[${new Date().toISOString()}] [STATUS] Сессия ${data.status}`));
          
          // Обработка завершенных состояний
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
            console.log(`🏁 Session ${data.status}, cleaning up...`);
            
            // Логируем завершение
            const finalMessage = `Процесс ${data.status === 'completed' ? 'успешно завершен' : 
                                data.status === 'failed' ? 'завершен с ошибкой' : 'остановлен'}`;
            console.log('🏁 ' + finalMessage);
            store.dispatch(addLog(`[${new Date().toISOString()}] [INFO] ${finalMessage}`));
            
            if (data.error) {
              console.error('❌ Session error:', data.error);
              store.dispatch(setError(data.error));
            }
            
            // ✅ Сохраняем состояние после завершения
            store.dispatch(saveStateToStorage());
          } else if (data.status === 'running') {
            // Если сессия running, но isTraining=false, исправляем
            if (!state.isTraining) {
              console.log('⚠️ Session is running but isTraining=false, fixing...');
              store.dispatch(setTrainingStatus(true));
              store.dispatch(saveStateToStorage());
            }
          }
        }
        break;
        
      case 'gpu_stats':
        console.log('🎮 GPU stats from WebSocket:', data.gpuStats);
        if (data.gpuStats) {
          const normalizedGpuStats = normalizeGpuBundleFromApi(data.gpuStats as Record<string, unknown>);
          console.log('🎮 Normalized GPU stats for store:', normalizedGpuStats);
          store.dispatch(setGpuStatsReal(normalizedGpuStats));
        }
        break;
        
      case 'system_stats':
        console.log('💻 System stats from WebSocket:', data.systemStats);
        if (data.systemStats) {
          const systemStats = normalizeSystemStats(data.systemStats);
          store.dispatch(setSystemStats(systemStats));
        }
        break;
        
      case 'error':
        console.error('❌ Error from WebSocket:', data.error);
        store.dispatch(addLog(`[${new Date().toISOString()}] [ERROR] WebSocket: ${data.error || 'Неизвестная ошибка'}`));
        store.dispatch(setError(data.error || 'Ошибка WebSocket'));
        break;
        
      case 'session_init': {
        console.log('🚀 Session initialized via WebSocket:', data);
        store.dispatch(addLog(`[${new Date().toISOString()}] [INFO] Сессия инициализирована`));
        
        if (data.progress !== undefined) {
          store.dispatch(updateProgress(data.progress));
        }
        
        // Устанавливаем сессию в running если не установлено
        const state = store.getState().finetune;
        if (state.currentSession && state.currentSession.status !== 'running') {
          const updatedSession: FinetuneSession = {
            ...state.currentSession,
            status: 'running'
          };
          store.dispatch(setCurrentSession(updatedSession));
          store.dispatch(setTrainingStatus(true));
          store.dispatch(saveStateToStorage());
        }
        break;
      }
        
      case 'dataset_stats':
        console.log('📊 Dataset stats from WebSocket:', data.stats);
        if (data.stats) {
          store.dispatch(updateDatasetStats(data.stats));
        }
        break;
        
      case 'training_metrics':
        console.log('📈 Training metrics from WebSocket:', data.metrics);
        if (data.metrics) {
          store.dispatch(updateMetrics(data.metrics));
        }
        break;
        
      case 'ping':
        console.log('🏓 Ping received:', data);
        // Отправляем pong обратно
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now(),
            clientTime: data.timestamp 
          }));
        }
        break;
        
      default:
        console.log('📦 Unknown WebSocket message type:', data.type, data);
        
        // 🔧 ВАЖНО: Даже для неизвестных типов пытаемся сохранить сообщение как лог
        if (typeof data.message === 'string') {
          store.dispatch(addLog(`[${new Date().toISOString()}] [${data.type?.toUpperCase() || 'UNKNOWN'}] ${data.message}`));
        } else if (data.type) {
          store.dispatch(addLog(`[${new Date().toISOString()}] [${data.type.toUpperCase()}] ${JSON.stringify(data)}`));
        }
        break;
    }
  } catch (error) {
    console.error('❌ Ошибка обработки WebSocket сообщения:', error);
    console.error('Raw event data:', event.data);
    console.error('Event type:', event.type);
    console.error('Error stack:', error instanceof Error ? error.stack : error);
    
    // 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем сырые данные как лог
    try {
      const rawLog = `[${new Date().toISOString()}] [ERROR] Не удалось разобрать WebSocket сообщение: ${event.data.toString().substring(0, 500)}`;
      console.log('💾 Saving raw WebSocket data as log:', rawLog);
      store.dispatch(addLog(rawLog));
    } catch (e) {
      console.error('Failed to log raw message:', e);
    }
  }
};

const handleWebSocketError = (error: Event) => {
  console.error('❌ WebSocket ошибка:', error);
  console.error('WebSocket details:', {
    readyState: ws?.readyState,
    url: ws?.url,
    bufferedAmount: ws?.bufferedAmount
  });
  
  store.dispatch(setWebsocketConnected(false));
  logError('Ошибка соединения WebSocket');
  
  // Добавляем лог с деталями ошибки
  store.dispatch(addLogWithLevel({
    message: `WebSocket ошибка: ${error.type} (readyState: ${ws?.readyState})`,
    level: 'error'
  }));
};

const handleWebSocketClose = (event: CloseEvent) => {
    store.dispatch(setWebsocketConnected(false));
    logWarning(`Соединение закрыто: ${event.code} ${event.reason || ''}`);
    
    // Очищаем старые обработчики
    if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
    }
    
    ws = null;
    
    // Пытаемся переподключиться только если тренировка активна
    const state = store.getState().finetune;
    if (reconnectAttempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS && 
        state.isTraining && 
        state.currentSession?.status === 'running') {
        
        setTimeout(() => {
            reconnectAttempts++;
            logInfo(`Попытка переподключения ${reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS}...`);
            
            if (state.sessionId) {
                connectWebSocket(state.sessionId);
            }
        }, WS_CONFIG.RECONNECT_DELAY);
    } else if (reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        store.dispatch(setWebsocketReconnecting(false));
        logError('Превышено количество попыток переподключения');
    }
};

const handleWebSocketOpen = (sessionId: string) => {
  store.dispatch(setWebsocketConnected(true));
  store.dispatch(setWebsocketReconnecting(false));
  reconnectAttempts = 0;
  console.log('✅ WebSocket connected successfully:', {
    sessionId,
    url: ws?.url,
    readyState: ws?.readyState
  });
  logInfo(`Подключено к мониторингу сессии ${sessionId}`);
  
  // 🔧 Отправляем тестовое сообщение для проверки
  setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('📤 Sent ping to WebSocket');
      } catch (err) {
        console.error('Error sending ping:', err);
      }
    }
  }, 1000);
};

function connectWebSocket(sessionId: string, wsUrl?: string) {
    // Закрываем существующее соединение
    disconnectWebSocket();
    
    store.dispatch(setWebsocketReconnecting(true));
    
    const websocketUrl = wsUrl || getWebSocketUrl(sessionId);
    
    console.log('🚀 Подключение WebSocket:', {
        sessionId,
        url: websocketUrl,
        fromBackend: wsUrl
    });
    
    try {
        ws = new WebSocket(websocketUrl);
        
        // Устанавливаем таймаут на подключение
        const connectionTimeout = setTimeout(() => {
            if (ws && ws.readyState === WebSocket.CONNECTING) {
                console.error('❌ Таймаут подключения WebSocket');
                ws.close();
                store.dispatch(setWebsocketConnected(false));
                store.dispatch(setWebsocketReconnecting(false));
            }
        }, WS_CONFIG.CONNECT_TIMEOUT);
        
        ws.onopen = () => {
            clearTimeout(connectionTimeout);
            handleWebSocketOpen(sessionId);
        };
        
        ws.onmessage = handleWebSocketMessage;
        ws.onerror = handleWebSocketError;
        ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            handleWebSocketClose(event);
        };
        
    } catch (error) {
        console.error('Error creating WebSocket:', error);
        store.dispatch(setWebsocketConnected(false));
        store.dispatch(setWebsocketReconnecting(false));
        logError(`WebSocket creation error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function disconnectWebSocket() {
    if (ws) {
        try {
            // Очищаем все обработчики
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            
            // Закрываем соединение
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Disconnect');
            }
        } catch (err) {
            console.warn('Error disconnecting WebSocket:', err);
        } finally {
            ws = null;
        }
    }
    
    store.dispatch(setWebsocketConnected(false));
    store.dispatch(setWebsocketReconnecting(false));
    reconnectAttempts = 0;
}

// Периодический опрос статуса
let pollingInterval: ReturnType<typeof setTimeout> | null = null;

function startStatusPolling(sessionId: string) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    const state = store.getState().finetune;
    if (!state.isTraining) {
      stopStatusPolling();
      return;
    }
    
    try {
      await finetuneService.getGpuStats();
      await finetuneService.getSystemStats();
      
      const status = await finetuneService.getStatus(sessionId);
      
      if (status) {
        store.dispatch(setCurrentSession(status));
        store.dispatch(updateProgress(status.progress));
        
        if (status.status !== 'running') {
          store.dispatch(setTrainingStatus(false));
          stopStatusPolling();
          disconnectWebSocket();
          
          if (status.status === 'completed') {
            logSuccess('Обучение завершено успешно');
          } else if (status.status === 'failed') {
            logError('Обучение завершено с ошибкой');
            if (status.error) {
              logError(status.error);
            }
          }
          
          // ✅ Сохраняем состояние после завершения
          store.dispatch(saveStateToStorage());
        }
      }
    } catch (error) {
      console.error('Ошибка при опросе статуса:', error);
      logWarning('Ошибка при опросе статуса');
    }
  }, 5000);
}

function stopStatusPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Восстановление состояния при загрузке
 */
export function restoreState() {
  const state = store.getState().finetune;

  if (state.currentSession?.status === 'running' && state.currentSession.sessionId) {
    currentSessionId = state.currentSession.sessionId;
    connectWebSocket(currentSessionId);
    startStatusPolling(currentSessionId);
    logInfo('Восстановлено состояние тренировки');
  }
}

interface WindowWithFinetune extends Window {
  finetuneUtils?: Record<string, unknown>;
  finetuneService?: typeof finetuneService;
}

// Автоматическая очистка при размонтировании
if (typeof window !== 'undefined') {
  (window as WindowWithFinetune).finetuneUtils = {
    getWebSocketUrl,
    connectWebSocket,
    disconnectWebSocket,
    startStatusPolling,
    stopStatusPolling,
    restoreState,
    abortAllRequests,
    normalizeGpuStats,
    normalizeSystemStats
  };
  
  (window as WindowWithFinetune).finetuneService = finetuneService;
  
  console.log('🔧 Finetune utilities exposed to window.finetuneUtils');
}
export const isWebSocketConnected = (): boolean => {
  return ws !== null && ws.readyState === WebSocket.OPEN;
};

// Экспортируем вспомогательные функции для тестирования
export const finetuneUtils = {
  getWebSocketUrl,
  connectWebSocket,
  disconnectWebSocket,
  isWebSocketConnected,
  startStatusPolling,
  stopStatusPolling,
  restoreState,
  abortAllRequests,
  normalizeGpuStats,
  normalizeSystemStats
};