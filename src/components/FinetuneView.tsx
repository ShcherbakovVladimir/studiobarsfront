// /home/user/projects/studioxlam/src/components/FinetuneView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { store } from '../store/store';
import {
  setError,
  setStartingStatus,
  setTrainingStatus,
  setPendingOperation,
  setIsInitialized,
  resetProgress,
  clearWarnings,
  clearErrors,
  setSessionId,
  setCurrentSession,
  removeSessionFromHistory,
  setWebsocketConnected,
  updateProgress,
} from '../store/finetuneSlice';
import { finetuneService, finetuneUtils } from '../services/finetuneService';
import { validateLearningRate } from '../utils/validation';
import { logInfo, logSuccess, logWarning, logError } from '../utils/logging';
import { getWebSocketUrl } from '../utils/wsUtils';

// Подкомпоненты
import ConfigurationPanel from './finetune/ConfigurationPanel';
import DatasetDropzone from './finetune/DatasetDropzone';
import Terminal from './finetune/Terminal';
import GpuStats from './finetune/GpuStats';
import SystemStats from './finetune/SystemStats';
import TrainingProgress from './finetune/TrainingProgress';
import ConnectionTest from './finetune/ConnectionTest';
import { InlineError } from './ui/alert-banner';
import { useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';

// ✅ Флаг для защиты от StrictMode в development
let wsConnectionInProgress = false;

const FinetuneView: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const sessionRestoredRef = useRef<boolean>(false);
  const wsCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsSetupPerformedRef = useRef<boolean>(false);
  
  // Состояния из Redux
  const {
    isTraining,
    isStarting,
    isStopping,
    isPendingOperation,
    progress,
    currentEpoch,
    totalEpochs,
    currentStep,
    totalSteps,
    metrics,
    config,
    dataset: storedDataset,
    sessionId,
    currentSession,
    websocketConnected,
    error,
  } = useSelector((state: RootState) => state.finetune);
  
  const { getToggle, setToggle } = useWorkspacePanel(PANEL_IDS.FINETUNE, 'train');
  const showAdvanced = getToggle('showAdvanced', false);
  const setShowAdvanced = (value: boolean) => setToggle('showAdvanced', value);
  const isSidebarOpen = getToggle('isSidebarOpen', false);
  const setIsSidebarOpen = (value: boolean) => setToggle('isSidebarOpen', value);

  // Локальные состояния
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // ============ ОТСЛЕЖИВАНИЕ РАЗМЕРА ОКНА ============
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      if (window.innerWidth >= 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // ============ УПРАВЛЕНИЕ WEBSOCKET ============
  // ✅ ИСПРАВЛЕНО: Защита от множественных подключений
  useEffect(() => {
    // Защита от StrictMode и повторных монтирований
    if (wsSetupPerformedRef.current) {
      console.log('🔒 WebSocket setup уже выполнен, пропускаем');
      return;
    }

    const setupWebSocket = () => {
      // Глобальная защита от конкурентных вызовов
      if (wsConnectionInProgress) {
        console.log('⚠️ WebSocket подключение уже в процессе');
        return;
      }

      if (!sessionId) {
        if (finetuneUtils.isWebSocketConnected()) {
          console.log('🔌 Нет активной сессии, отключаем WebSocket');
          finetuneUtils.disconnectWebSocket();
          dispatch(setWebsocketConnected(false));
        }
        return;
      }

      // Проверяем текущее состояние
      const isConnected = finetuneUtils.isWebSocketConnected();
      
      if (!isConnected) {
        wsConnectionInProgress = true;
        console.log('🔌 Подключение WebSocket для сессии:', sessionId);
        
        try {
          const wsUrl = getWebSocketUrl(sessionId);
          finetuneUtils.connectWebSocket(sessionId, wsUrl);
        } finally {
          // Сбрасываем флаг через 500мс
          setTimeout(() => {
            wsConnectionInProgress = false;
          }, 500);
        }
      } else {
        console.log('✅ WebSocket уже подключен для сессии:', sessionId);
      }
    };

    setupWebSocket();
    wsSetupPerformedRef.current = true;

    return () => {
      // ✅ НЕ сбрасываем wsSetupPerformedRef при размонтировании!
      // Это защита от StrictMode
    };
  }, [sessionId, dispatch]); // ТОЛЬКО sessionId!

  // ============ МОНИТОРИНГ WEBSOCKET ============
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (wsCheckRef.current) {
      clearInterval(wsCheckRef.current);
      wsCheckRef.current = null;
    }

    // Запускаем мониторинг только для активных сессий
    if (sessionId && currentSession?.status === 'running') {
      console.log('📡 Запуск мониторинга WebSocket для сессии:', sessionId);
      
      wsCheckRef.current = setInterval(() => {
        // Проверяем, не в процессе ли уже подключение
        if (!wsConnectionInProgress && !finetuneUtils.isWebSocketConnected()) {
          console.log('⚠️ WebSocket потерян, переподключение...');
          
          wsConnectionInProgress = true;
          try {
            const wsUrl = getWebSocketUrl(sessionId);
            finetuneUtils.connectWebSocket(sessionId, wsUrl);
          } finally {
            setTimeout(() => {
              wsConnectionInProgress = false;
            }, 500);
          }
        }
      }, 15000); // Каждые 15 секунд
    }

    return () => {
      if (wsCheckRef.current) {
        clearInterval(wsCheckRef.current);
        wsCheckRef.current = null;
      }
    };
  }, [sessionId, currentSession?.status]);

  // ============ ВОССТАНОВЛЕНИЕ СЕССИИ ============
  // ✅ ИСПРАВЛЕНО: Только один раз, с защитой от StrictMode
  useEffect(() => {
    let mounted = true;

    // Защита от повторного восстановления
    if (sessionRestoredRef.current) {
      console.log('⚠️ Сессия уже восстановлена, пропускаем');
      return;
    }

    const restoreSession = async () => {
      if (!mounted) return;
      
      setIsRestoring(true);
      
      try {
        console.log('🔄 Попытка восстановления сессии...');
        
        const state = store.getState().finetune;
        
        if (!state.currentSession || !state.sessionId) {
          console.log('ℹ️ Нет сессии для восстановления');
          dispatch(setIsInitialized(true));
          dispatch(setTrainingStatus(false));
          setIsRestoring(false);
          sessionRestoredRef.current = true;
          return;
        }

        // Даем серверу время
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (!mounted) return;

        const session = await finetuneService.getStatus(state.sessionId);

        if (!mounted) return;

        if (session) {
          console.log('✅ Сессия найдена на сервере:', session.sessionId);
          
          dispatch(setCurrentSession(session));
          dispatch(setSessionId(session.sessionId));
          
          if (session.status === 'running') {
            console.log('🎯 Сессия активна, восстанавливаем состояние');
            dispatch(setTrainingStatus(true));
            dispatch(updateProgress(session.progress || 0));
            
            // WebSocket подключится автоматически через useEffect с sessionId
            logInfo(`Восстановлена активная сессия: ${session.sessionId}`);
            finetuneUtils.startStatusPolling(session.sessionId);
          } else {
            console.log('ℹ️ Сессия не активна, статус:', session.status);
            dispatch(setTrainingStatus(false));
            logInfo(`Восстановлена неактивная сессия: ${session.sessionId}`);
          }
        } else {
          console.log('🗑️ Сессия не найдена на сервере, очистка...');
          dispatch(removeSessionFromHistory(state.sessionId));
          dispatch(setSessionId(null));
          dispatch(setCurrentSession(null));
          dispatch(setTrainingStatus(false));
          logWarning('Предыдущая сессия не найдена на сервере');
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error('❌ Ошибка восстановления сессии:', error);
        logError('Ошибка восстановления сессии: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        if (mounted) {
          dispatch(setIsInitialized(true));
          setIsRestoring(false);
          sessionRestoredRef.current = true;
        }
      }
    };

    const restoreTimeout = setTimeout(() => {
      restoreSession();
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(restoreTimeout);
      // ✅ НИЧЕГО НЕ СБРАСЫВАЕМ!
    };
  }, [dispatch]); // ТОЛЬКО dispatch!

  // ============ СТАТИСТИКА ============
  useEffect(() => {
    console.log('🔄 Запуск автоматического обновления статистики...');
    
    const loadStats = () => {
      finetuneService.getGpuStats();
      finetuneService.getSystemStats();
    };
    
    loadStats();
    
    const interval = setInterval(() => {
      if (!isTraining) {
        loadStats();
      }
    }, 5000);
    
    return () => {
      console.log('🧹 Очистка интервала обновления статистики...');
      clearInterval(interval);
    };
  }, [isTraining]);

  // ============ ОЧИСТКА ПРИ РАЗМОНТИРОВАНИИ ============
  useEffect(() => {
    return () => {
      console.log('🧹 Компонент размонтируется...');
      
      // Останавливаем polling
      finetuneUtils.stopStatusPolling();
      
      // Очищаем интервалы
      if (wsCheckRef.current) {
        clearInterval(wsCheckRef.current);
        wsCheckRef.current = null;
      }
      
      // ✅ НЕ закрываем WebSocket!
      // ✅ НЕ сбрасываем флаги!
      // WebSocket должен жить в сервисе
    };
  }, []);

  // ============ ЗАПУСК ОБУЧЕНИЯ ============
  const handleStart = async (): Promise<void> => {
    if (isPendingOperation) {
      logWarning('Операция уже выполняется');
      return;
    }
    
    // Валидация
    const validationErrors: string[] = [];
    
    if (!config.modelName.trim()) {
      validationErrors.push('Пожалуйста, укажите название модели');
    }
    
    if (config.epochs <= 0 || config.epochs > 100) {
      validationErrors.push('Количество эпох должно быть от 1 до 100');
    }
    
    if (config.batchSize <= 0 || config.batchSize > 32) {
      validationErrors.push('Batch size должен быть от 1 до 32');
    }
    
    const lrValidation = validateLearningRate(config.learningRate);
    if (!lrValidation.valid) {
      validationErrors.push(lrValidation.message || 'Learning Rate должен быть от 0.0000001 до 0.01');
    }
    
    if (config.loraRank < 4 || config.loraRank > 256) {
      validationErrors.push('LoRA rank должен быть от 4 до 256');
    }
    
    if (!storedDataset) {
      validationErrors.push('Пожалуйста, загрузите датасет');
    }
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(errorMsg => logError(errorMsg));
      dispatch(setError(validationErrors[0] ?? null));
      return;
    }
    
    if (isTraining) {
      logWarning('Обучение уже запущено');
      dispatch(setError('Обучение уже запущено'));
      return;
    }
    
    dispatch(setError(null));
    dispatch(clearWarnings());
    dispatch(clearErrors());
    dispatch(resetProgress());
    
    logInfo('=== НАЧАЛО НОВОЙ СЕССИИ ОБУЧЕНИЯ ===');
    logInfo(`Конфигурация: Модель=${config.modelName}, Epochs=${config.epochs}, LR=${config.learningRate}`);
    logInfo(`Датасет: ${storedDataset?.name || 'неизвестно'}`);
    
    try {
      await finetuneService.startTraining(config, storedDataset);
      logSuccess('Процесс обучения запущен успешно');
      
      // Сбрасываем флаг WebSocket setup для новой сессии
      wsSetupPerformedRef.current = false;
      wsConnectionInProgress = false;
      
      setTimeout(() => {
        const state = store.getState().finetune;
        if (state.currentSession && 
            state.currentSession.status !== 'running' && 
            state.isTraining) {
          logWarning('Обнаружено несоответствие состояния, исправляем...');
          dispatch(setTrainingStatus(false));
        }
      }, 5000);
      
    } catch (error) {
      console.error('Ошибка запуска обучения:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logError(`Ошибка запуска обучения: ${errorMessage}`);
      
      dispatch(setError(errorMessage));
      dispatch(setTrainingStatus(false));
      dispatch(setStartingStatus(false));
      dispatch(setPendingOperation(false));
      
      if (errorMessage.toLowerCase().includes('network') || 
          errorMessage.toLowerCase().includes('fetch') ||
          errorMessage.toLowerCase().includes('timeout')) {
        logWarning('Проверьте подключение к серверу обучения');
      }
    }
  };
  
  // ============ ОСТАНОВКА ОБУЧЕНИЯ ============
  const handleStop = async (): Promise<void> => {
    if (!sessionId) {
      logError('Нет активной сессии для остановки');
      return;
    }
    
    if (isPendingOperation) {
      logWarning('Операция уже выполняется');
      return;
    }
    
    try {
      await finetuneService.stopTraining();
    } catch (error) {
      console.error('Ошибка остановки обучения:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setError(errorMessage));
    }
  };

  // ============ UI КОМПОНЕНТЫ ============
  const MobileMenuButton = () => (
    <button
      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      className="lg:hidden fixed top-4 right-4 z-50 p-3 surface-elevated text-foreground/80 rounded-lg shadow-lg border border-border hover:bg-background/50 dark:hover:bg-muted transition-all active:scale-95"
      aria-label="Toggle menu"
      style={{ zIndex: 60 }}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isSidebarOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );

  const MobileOverlay = () => (
    isSidebarOpen && (
      <div
        className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-all duration-300"
        onClick={() => setIsSidebarOpen(false)}
        style={{ zIndex: 40 }}
      />
    )
  );

  const isMobile = windowSize.width < 768;

  // ============ РЕНДЕР ============
  return (
    <div className="relative w-full h-full bg-background/40 overflow-hidden">
      <MobileMenuButton />
      <MobileOverlay />
      
      <div className="flex h-full w-full p-2 md:p-3 lg:p-4 gap-3 md:gap-4">
        {/* Сайдбар (левая панель) */}
        <div
          className={`
 h-full flex flex-col
            glass-panel border border-border
            rounded-2xl shadow-sm
            transition-all duration-300 ease-in-out overflow-hidden
            ${isMobile ? `
              fixed inset-y-3 left-3 right-3
              ${isSidebarOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'}
              z-50
            ` : `
              w-80 md:w-96 lg:w-105 xl:w-120
              shrink-0 relative
`}
`}
          style={{
            maxHeight: isMobile ? 'calc(100vh - 24px)' : '100%',
            zIndex: 50
          }}
        >
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {isMobile && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Finetune Studio
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Тонкая настройка моделей
                  </p>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground/80 dark:text-muted-foreground dark:hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <div className="animate-in fade-in duration-500">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2">
                Настройка обучения
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                Настройте параметры и загрузите данные для тонкой настройки модели
              </p>
            </div>
            
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-2">
              <ConnectionTest
                isTraining={isTraining}
                isStarting={isStarting}
                isStopping={isStopping}
                websocketConnected={websocketConnected}
              />
            </div>
            
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              <ConfigurationPanel
                isTraining={isTraining}
                isStarting={isStarting}
                isStopping={isStopping}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                isMobile={isMobile}
              />
            </div>
            
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-6">
              <DatasetDropzone
                isTraining={isTraining}
                isStarting={isStarting}
                isStopping={isStopping}
                isMobile={isMobile}
              />
            </div>
            
            {isTraining && currentSession && (
              <div className="animate-in fade-in duration-500 slide-in-from-bottom-8">
                <TrainingProgress
                  progress={progress}
                  currentEpoch={currentEpoch}
                  totalEpochs={totalEpochs}
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  metrics={metrics}
                  currentSession={currentSession}
                  isMobile={isMobile}
                />
              </div>
            )}
            
            {error && (
              <div className="animate-in fade-in duration-300">
                <InlineError
                  message={error}
                  onDismiss={() => dispatch(setError(null))}
                />
              </div>
            )}
            
            {isRestoring && (
              <div className="animate-in fade-in duration-300">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs md:text-sm text-primary">
                      Восстановление сессии...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Кнопка запуска/остановки */}
          <div className="border-t border-border glass-panel p-4 md:p-6 space-y-2 md:space-y-3">
            <button
              onClick={isTraining ? handleStop : handleStart}
              disabled={
                isPendingOperation ||
                (!config.modelName.trim() || config.epochs <= 0 || !storedDataset) && !isTraining ||
                isRestoring
              }
              className={`
 w-full py-2.5 md:py-3 rounded-xl font-medium text-sm md:text-base
                transition-all flex items-center justify-center gap-2 
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
                ${isTraining
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                  : isStarting || isStopping
                  ? 'bg-muted-foreground text-white cursor-not-allowed shadow-lg'
                  : 'btn-gradient text-white shadow-lg shadow-blue-500/20'
                }
`}
            >
              {isRestoring ? (
                <>
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Восстановление...</span>
                </>
              ) : isStarting ? (
                <>
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Запуск...</span>
                </>
              ) : isTraining ? (
                <>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span className="text-sm md:text-base">Остановить обучение</span>
                </>
              ) : isStopping ? (
                <>
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Остановка...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm md:text-base">Начать обучение</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Правая панель (Терминал и Мониторинг) */}
        <div className="flex-1 flex flex-col gap-3 md:gap-4 h-full overflow-hidden">
          <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border overflow-hidden relative">
            <Terminal 
              logsEndRef={logsEndRef}
              isMobile={isMobile}
            />
          </div>

          <div className="h-40 md:h-48 lg:h-56 glass-panel border border-border rounded-2xl shadow-sm p-3 md:p-4 shrink-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-3 md:gap-4 h-full">
              <SystemStats isMobile={isMobile} />
              <GpuStats isMobile={isMobile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinetuneView;