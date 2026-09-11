// /home/user/projects/studioxlam/src/App.tsx
import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ViewMode } from '../types';
import type { RootState, AppDispatch } from '../store/store';
import type { ModelInfo } from '../types';
import { 
  setServerStatus as setAppServerStatus,
  setViewMode 
} from '../store/appSlice';
import { 
  setSelectedModelId, 
  setActiveModel,
  setServerModels,
  setServerStatus as setModelsServerStatus
} from '../store/modelsSlice';
import agentService from '../services/agentService';
import { fetchChatApi } from '../services/apiClient';
import { confirmDialog } from '../services/dialogService';
import { useViewModeRouteSync } from '../hooks/useViewModeRouteSync';
import { pathFromViewMode, isFillAppPath } from '../utils/viewModeRoutes';
import { isEmployee } from '../utils/auth';
import { isServerOnline } from '../utils/serverStatus';
import { TopBanner } from './ui/top-banner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const BenchmarkingView = lazy(() => import('./BenchmarkingView'));
const AgentLab = lazy(() => import('./AgentLab'));
const ModelCatalog = lazy(() => import('./ModelCatalog'));
const FinetuneView = lazy(() => import('./FinetuneView'));
const RAGChat = lazy(() => import('./RAGChat'));
const InferenceLab = lazy(() => import('./InferenceLab'));

// Определяем интерфейс для модели с сервера
interface ServerModel {
  id?: string;
  name?: string;
  parameters?: string;
  type?: string;
  description?: string;
  capabilities?: string[];
  available?: boolean;
  active?: boolean;
  size?: string;
  recommended?: boolean;
  file?: string;
  path?: string;
  supportsTools?: boolean;
  quantType?: string;
  isInstruct?: boolean;
  chatTemplate?: string;
  rawSize?: number;
  lastScanned?: string;
  modelFamily?: string;
  relativePath?: string;
  directory?: string;
  favorite?: boolean;
}

// Вспомогательная функция для преобразования строки modelFamily в тип ModelInfo
const parseModelFamily = (family: string | undefined): ModelInfo['modelFamily'] => {
  if (!family) return 'unknown';
  
  const lowerFamily = family.toLowerCase();
  if (lowerFamily.includes('llama')) return 'llama';
  if (lowerFamily.includes('mistral')) return 'mistral';
  if (lowerFamily.includes('saiga')) return 'saiga';
  if (lowerFamily.includes('xlam')) return 'xlam';
  if (lowerFamily.includes('deepseek')) return 'deepseek';
  if (lowerFamily.includes('zephyr')) return 'zephyr';
  
  return 'unknown';
};

const MainApp: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  useViewModeRouteSync();
  const { viewMode, isDarkMode } = useSelector((state: RootState) => state.app);
  const employee = useSelector((state: RootState) => isEmployee(state.auth.user));
  const selectedModelId = useSelector((state: RootState) => state.models.selectedModelId);
  const activeModelId = useSelector((state: RootState) => state.models.activeModel);
  const models = useSelector((state: RootState) => state.models.models);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [modelStartingError, setModelStartingError] = useState<string | null>(null);
  
  // Находим выбранную модель
  const findSelectedModel = useCallback((): ModelInfo | undefined => {
    if (selectedModelId) {
      return models.find(m => m.id === selectedModelId);
    }
    if (activeModelId) {
      return models.find(m => m.id === activeModelId);
    }
    return models.find(m => m.available) || models[0];
  }, [models, selectedModelId, activeModelId]);

  const selectedModel = findSelectedModel();

  const goToViewMode = useCallback(
    (mode: typeof ViewMode[keyof typeof ViewMode]) => {
      navigate(pathFromViewMode(mode));
      dispatch(setViewMode(mode));
    },
    [dispatch, navigate]
  );

  const formatServerModel = useCallback((model: ServerModel): ModelInfo => {
    return {
      id: model.id || `server_${model.name || 'unknown'}`,
      name: model.name || 'Unknown Model',
      parameters: model.parameters || '8B',
      updated: model.lastScanned || (new Date().toISOString().split('T')[0] ?? ''),
      type: model.type || 'GGUF',
      description: model.description || 'Server model',
      isGGUF: true,
      capabilities: model.capabilities || ['Рассуждение', 'Планирование'],
      available: model.available || false,
      active: model.active || false,
      size: model.size || 'N/A',
      rawSize: model.rawSize || 0,
      recommended: model.recommended || false,
      source: 'server' as const,
      modelKey: model.id || '',
      file: model.file || '',
      path: model.path || '',
      supportsTools: model.supportsTools || false,
      quantType: model.quantType,
      isInstruct: model.isInstruct,
      chatTemplate: model.chatTemplate,
      modelFamily: parseModelFamily(model.modelFamily),
      relativePath: model.relativePath || '',
      directory: model.directory || '',
      lastScanned: model.lastScanned,
      favorite: model.favorite || false
    };
  }, []);

  // Функция для запуска модели
  const handleStartModel = useCallback(async (modelId: string) => {
    console.log(`🚀 Запуск модели ${modelId}...`);
    setModelStartingError(null);
    
    try {
      // Получаем информацию о модели для определения типа
      const model = models.find(m => m.id === modelId);
      
      if (!model) {
        throw new Error(`Модель ${modelId} не найдена в списке`);
      }
      
      // Определяем тип модели и рекомендуемый wrapper
      const isSaigaModel = model.modelFamily === 'saiga' || 
                          model.name?.toLowerCase().includes('saiga');
      const isXLAMModel = model.supportsTools === true || 
                          model.modelFamily === 'xlam' ||
                          model.name?.toLowerCase().includes('xlam');
      const isMistralModel = model.modelFamily === 'mistral' || 
                            model.chatTemplate === 'mistral' ||
                            model.name?.toLowerCase().includes('mistral');
      
      // Определяем рекомендуемый wrapper для модели
      let recommendedWrapper = 'default';
      let needsWrapperUpdate = false;
      
      if (isSaigaModel) {
        recommendedWrapper = 'mistral';
        needsWrapperUpdate = true;
        console.log(`📝 Обнаружена Saiga модель, рекомендуемый wrapper: ${recommendedWrapper}`);
      } else if (isXLAMModel) {
        recommendedWrapper = 'xlam';
        needsWrapperUpdate = true;
        console.log(`📝 Обнаружена xLAM модель, рекомендуемый wrapper: ${recommendedWrapper}`);
      } else if (isMistralModel) {
        recommendedWrapper = 'mistral';
        needsWrapperUpdate = true;
        console.log(`📝 Обнаружена Mistral модель, рекомендуемый wrapper: ${recommendedWrapper}`);
      } else {
        console.log(`📝 Модель ${model.name} использует wrapper по умолчанию`);
      }
      
      // Если модель уже активна, просто переключаемся и обновляем wrapper если нужно
      if (activeModelId === modelId) {
        console.log(`✅ Модель ${modelId} уже активна`);
        
        // Обновляем wrapper если нужно
        if (needsWrapperUpdate) {
          console.log(`🔄 Обновляем wrapper на ${recommendedWrapper} для активной модели`);
          await agentService.createChatSession('default', undefined, recommendedWrapper);
        }
        
        goToViewMode(ViewMode.AGENT_LAB);
        return;
      }
      
      // Очищаем все старые сессии перед загрузкой новой модели
      console.log(`🧹 Очистка старых сессий...`);
      try {
        await agentService.cleanupSessions(0);
        console.log(`✅ Сессии очищены`);
      } catch (cleanupError) {
        console.warn(`⚠️ Не удалось очистить сессии:`, cleanupError);
      }
      
      // Если есть активная модель, останавливаем её
      if (activeModelId) {
        console.log(`🛑 Останавливаем текущую модель ${activeModelId}...`);
        try {
          const stopResult = await agentService.stopModel();
          if (stopResult.success) {
            console.log(`✅ Модель ${activeModelId} остановлена`);
          } else {
            console.warn(`⚠️ Остановка модели вернула:`, stopResult);
          }
        } catch (stopError: unknown) {
          const stopMessage = stopError instanceof Error ? stopError.message : String(stopError);
          // Игнорируем 409 ошибку при остановке (модель уже неактивна)
          if (stopMessage.includes('409') || stopMessage.includes('Conflict')) {
            console.log(`ℹ️ Модель ${activeModelId} уже была остановлена, продолжаем...`);
          } else if (stopMessage.includes('400')) {
            console.log(`ℹ️ Модель ${activeModelId} неактивна или уже остановлена`);
          } else {
            console.warn('Ошибка при остановке модели:', stopError);
          }
        }
        
        // Даем время на освобождение ресурсов
        console.log(`⏳ Ожидание освобождения ресурсов (2 сек)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Загружаем новую модель с force=true для принудительной загрузки
      console.log(`🔄 Загрузка модели ${modelId} с force=true...`);
      
      const loadResponse = await fetchChatApi('/model/load', {
        method: 'POST',
        body: JSON.stringify({ 
          modelId, 
          force: true,
          preserveSessions: false
        })
      });

      let loadResult: { success?: boolean; error?: string; message?: string } = {};
      try {
        loadResult = await loadResponse.json() as typeof loadResult;
      } catch {
        loadResult = {};
      }

      if (!loadResponse.ok || !loadResult.success) {
        throw new Error(
          loadResult.error ||
          loadResult.message ||
          `${loadResponse.status} ${loadResponse.statusText}`
        );
      }

      console.log(`✅ Модель ${modelId} запущена успешно`);
      dispatch(setActiveModel(modelId));
      dispatch(setSelectedModelId(modelId));
      
      // Создаем сессию с правильным wrapper для модели
      if (needsWrapperUpdate) {
        console.log(`📝 Создаем сессию с wrapper: ${recommendedWrapper}`);
        await agentService.createChatSession('default', undefined, recommendedWrapper);
      } else {
        // Для default wrapper тоже создаем сессию
        console.log(`📝 Создаем сессию с wrapper: default`);
        await agentService.createChatSession('default', undefined, 'default');
      }
      
      // Обновляем статус сервера
      const status = await agentService.getServerStatus();
      dispatch(setAppServerStatus(status));
      dispatch(setModelsServerStatus(status));
      
      // Переключаемся на чат
      goToViewMode(ViewMode.AGENT_LAB);
    } catch (error) {
      console.error('❌ Ошибка запуска модели:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      // Проверяем, не является ли ошибка 409 (модель уже загружена)
      if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
        console.log(`ℹ️ Модель ${modelId} возможно уже загружена, проверяем статус...`);
        
        try {
          // Проверяем текущий статус сервера
          const status = await agentService.getServerStatus();
          if (status.activeModel === modelId) {
            console.log(`✅ Модель ${modelId} уже активна на сервере`);
            dispatch(setActiveModel(modelId));
            dispatch(setSelectedModelId(modelId));
            dispatch(setAppServerStatus(status));
            dispatch(setModelsServerStatus(status));
            goToViewMode(ViewMode.AGENT_LAB);
            return;
          }
        } catch (statusError) {
          console.warn('Не удалось проверить статус сервера:', statusError);
        }
      }
      
      // Проверяем ошибку 400 (несовместимость)
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        const currentModel = models.find(m => m.id === modelId);
        if (currentModel?.modelFamily === 'saiga') {
          setModelStartingError(`Saiga модель загружена, но чат может работать с ограничениями. Попробуйте отправить сообщение.`);
          // Пытаемся продолжить, возможно модель все же загрузилась
          try {
            const status = await agentService.getServerStatus();
            if (status.activeModel === modelId) {
              console.log(`✅ Модель ${modelId} все же активна, продолжаем...`);
              dispatch(setActiveModel(modelId));
              dispatch(setSelectedModelId(modelId));
              goToViewMode(ViewMode.AGENT_LAB);
              return;
            }
          } catch {
            // Status check failed; continue with generic error handling
          }
        } else {
          setModelStartingError(`Ошибка загрузки модели: модель несовместима с текущими настройками. Попробуйте другую модель.`);
        }
      } else if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway')) {
        setModelStartingError(`Сервер временно недоступен. Попробуйте перезагрузить страницу.`);
        // Предлагаем перезагрузить страницу через 3 секунды
        setTimeout(() => {
          void (async () => {
            const confirmed = await confirmDialog({
              title: 'Сервер не отвечает',
              description: 'Перезагрузить страницу?',
              confirmLabel: 'Перезагрузить',
            });
            if (confirmed) window.location.reload();
          })();
        }, 1000);
      } else {
        setModelStartingError(`Ошибка запуска модели: ${errorMessage}`);
      }
      
      setTimeout(() => setModelStartingError(null), 8000);
    }
  }, [dispatch, activeModelId, models, goToViewMode]);

  // Функция для загрузки данных с сервера
  const loadServerData = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Загружаем статус сервера
      const status = await agentService.getServerStatus();
      console.log('📡 Статус сервера получен:', status);
      dispatch(setAppServerStatus(status));
      dispatch(setModelsServerStatus(status));
      
      // 2. Если сервер онлайн, загружаем модели
      if (isServerOnline(status)) {
        const serverModels = await agentService.getModels(true);
        console.log('📦 Загружено моделей с сервера:', serverModels.length);
        
        if (serverModels.length > 0) {
          // Преобразуем модели в формат для Redux
          const formattedModels = serverModels.map((model: ServerModel) => formatServerModel(model));
          
          dispatch(setServerModels(formattedModels));
          
          // Устанавливаем активную модель если она есть
          if (status.activeModel) {
            dispatch(setActiveModel(status.activeModel));
            if (!selectedModelId) {
              dispatch(setSelectedModelId(status.activeModel));
            }
          } else if (formattedModels.length > 0) {
            // Выбираем первую доступную модель если нет активной
            const firstAvailable = formattedModels.find(m => m.available);
            if (firstAvailable && !selectedModelId) {
              dispatch(setSelectedModelId(firstAvailable.id));
            }
          }
        } else {
          console.warn('⚠️ Сервер не вернул модели');
        }
      } else {
        console.warn('⚠️ Сервер недоступен:', status.status);
        setConnectionError(`Сервер недоступен: ${status.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setConnectionError(`Не удалось загрузить данные с сервера: ${errorMessage}`);
      
      // Устанавливаем статус ошибки
      dispatch(setAppServerStatus({
        status: 'error',
        serverReady: false,
        activeModel: null,
        modelLoaded: false,
        timestamp: new Date().toISOString(),
        sessions: 0
      }));
      
      return false;
    }
  }, [dispatch, formatServerModel, selectedModelId]);

  // Функция для выбора модели (без запуска)
  const handleModelSelect = useCallback((modelId: string) => {
    console.log(`📌 Выбрана модель: ${modelId}`);
    dispatch(setSelectedModelId(modelId));
    goToViewMode(ViewMode.AGENT_LAB);
  }, [dispatch, goToViewMode]);

  // Initial data loading
  useEffect(() => {
    let isMounted = true;

    const initApp = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setConnectionError(null);
      
      try {
        console.log('🔄 Инициализация приложения...');
        await loadServerData();
      } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        if (isMounted) {
          setConnectionError('Не удалось подключиться к серверу');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initApp();
    
    const pollingInterval = setInterval(async () => {
      if (!isMounted) return;
      
      try {
        const status = await agentService.getServerStatus();
        dispatch(setAppServerStatus(status));
        dispatch(setModelsServerStatus(status));
        
        // Если статус изменился, обновляем активную модель
        if (status.activeModel && status.activeModel !== activeModelId) {
          dispatch(setActiveModel(status.activeModel));
        }
      } catch (error) {
        console.error('Ошибка polling:', error);
      }
    }, 30000); // 30 секунд вместо 10

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
    };
  }, [loadServerData, dispatch, activeModelId]);

  const handleRefreshModels = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(null);
    
    try {
      console.log('🔄 Принудительное обновление моделей...');
      await loadServerData();
    } catch (error) {
      console.error('❌ Ошибка обновления моделей:', error);
      setConnectionError('Не удалось обновить модели');
    } finally {
      setIsLoading(false);
    }
  }, [loadServerData]);

  const renderContent = useCallback(() => {
    if (employee) {
      if (viewMode === ViewMode.RAG_ANALYTICS) {
        return <RAGChat isDarkMode={isDarkMode} />;
      }
      return <AgentLab selectedModel={selectedModel || null} />;
    }
    switch (viewMode) {
      case ViewMode.BENCHMARK:
        return <BenchmarkingView isDarkMode={isDarkMode} />;
      case ViewMode.FINETUNE:
        return <FinetuneView />;
      case ViewMode.RAG_ANALYTICS:
        // RAGChat теперь сам управляет своей шириной через классы w-full
        return <RAGChat isDarkMode={isDarkMode} />;
      case ViewMode.INFERENCE_LAB:
        return <InferenceLab selectedModel={selectedModel || null} />;
      case ViewMode.AGENT_LAB:
        return <AgentLab selectedModel={selectedModel || null} />;
      case ViewMode.CATALOG:
      default:
        return (
          <ModelCatalog 
            onSelectModel={handleModelSelect}
            onStartModel={handleStartModel}
          />
        );
    }
  }, [employee, viewMode, isDarkMode, selectedModel, models.length, isLoading, handleRefreshModels, handleModelSelect, handleStartModel]);

  const fill = isFillAppPath(location.pathname);

  return (
    <div className={cn('min-w-0', fill && 'h-full flex flex-col overflow-hidden')}>
      {isLoading && (
        <TopBanner
          variant="info"
          message="Загрузка данных с сервера..."
          icon={<Loader2 className="w-4 h-4 animate-spin" />}
        />
      )}

      {connectionError && !isLoading && (
        <TopBanner
          variant="error"
          message={connectionError}
          icon={<AlertCircle className="w-4 h-4" />}
          action={{ label: 'Повторить', onClick: handleRefreshModels }}
        />
      )}

      {modelStartingError && !isLoading && (
        <TopBanner
          variant="error"
          message={modelStartingError}
          icon={<AlertCircle className="w-4 h-4" />}
        />
      )}

      <div className={cn(fill ? 'flex-1 min-h-0 overflow-hidden' : undefined)}>
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
              Загрузка…
            </div>
          }
        >
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
};

export default MainApp;
