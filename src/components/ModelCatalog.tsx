// /home/user/projects/studioxlam/src/components/ModelCatalog.tsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ModelCard from './ModelCard';
import type { RootState } from '../store/store';
import type { XLAMModel } from '../types';
import { setServerModels, setLoading, setError, setActiveModel, setSelectedModelId } from '../store/modelsSlice';
import { setServerStatus } from '../store/appSlice';
import { isServerOnline } from '../utils/serverStatus';
import agentService from '../services/agentService';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';

interface ModelCatalogProps {
  onSelectModel?: (modelId: string) => void;
  onStartModel?: (modelId: string) => Promise<void>;
}

// Интерфейс для модели с сервера
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

// Ключ для localStorage кэша
const MODELS_CACHE_KEY = 'cached_server_models';
const MODELS_CACHE_TIMESTAMP_KEY = 'cached_models_timestamp';
const CACHE_DURATION = 30000; // 30 секунд

const toModelFamily = (family: string): XLAMModel['modelFamily'] => {
  const validFamilies: XLAMModel['modelFamily'][] = ['llama', 'mistral', 'saiga', 'xlam', 'deepseek', 'zephyr', 'qwen', 'unknown'];
  return validFamilies.includes(family as XLAMModel['modelFamily'])
    ? (family as XLAMModel['modelFamily'])
    : 'unknown';
};

const CatalogShell: React.FC<{ children: React.ReactNode; headerExtra?: React.ReactNode }> = ({
  children,
  headerExtra,
}) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
    <header className={cn(celestia.appHeader, 'flex items-center')}>
      <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="shrink-0 text-sm font-semibold text-foreground">Каталог моделей</h2>
          <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
          <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">
            GGUF на сервере
          </span>
        </div>
        {headerExtra}
      </div>
    </header>
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
      {children}
    </div>
  </div>
);

const ModelCatalog: React.FC<ModelCatalogProps> = ({ onSelectModel, onStartModel }) => {
  const dispatch = useDispatch();
  const models = useSelector((state: RootState) => state.models.models);
  const isLoading = useSelector((state: RootState) => state.models.isLoading);
  const error = useSelector((state: RootState) => state.models.error);
  const serverStatus = useSelector((state: RootState) => state.app.serverStatus);
  const activeModelId = useSelector((state: RootState) => state.models.activeModel);
  
  // ========== ФЛАГИ ДЛЯ КОНТРОЛЯ ==========
  const loadingInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastLoadTimeRef = useRef<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [startingModelId, setStartingModelId] = useState<string | null>(null);
  const [startingError, setStartingError] = useState<string | null>(null);

  // Функция для определения семейства модели по имени
  const detectModelFamily = useCallback((model: ServerModel): XLAMModel['modelFamily'] => {
    const name = (model.name || '').toLowerCase();
    const file = (model.file || '').toLowerCase();
    const description = (model.description || '').toLowerCase();
    
    // Qwen detection (должен быть первым, так как qwen может содержать другие ключевые слова)
    if (name.includes('qwen') || file.includes('qwen') || model.modelFamily === 'qwen') {
      return 'qwen';
    }
    // Saiga detection
    if (name.includes('saiga') || description.includes('saiga') || model.modelFamily === 'saiga') {
      return 'saiga';
    }
    // xLAM detection
    if (name.includes('xlam') || description.includes('xlam') || model.supportsTools) {
      return 'xlam';
    }
    // Mistral detection
    if (name.includes('mistral') || model.modelFamily === 'mistral') {
      return 'mistral';
    }
    // Llama detection
    if (name.includes('llama') || model.modelFamily === 'llama') {
      return 'llama';
    }
    // Возвращаем из поля если есть
    if (model.modelFamily) {
      return toModelFamily(model.modelFamily);
    }
    return 'unknown';
  }, []);

  // Функция для преобразования модели с сервера в формат XLAMModel
  const formatServerModel = useCallback((model: ServerModel): XLAMModel => {
    const modelFamily = detectModelFamily(model);
    
    // Определяем chat template на основе семейства
    let chatTemplate = model.chatTemplate;
    if (!chatTemplate) {
      if (modelFamily === 'qwen') {
        chatTemplate = 'chatml';
      } else if (modelFamily === 'saiga') {
        chatTemplate = 'saiga';
      } else if (modelFamily === 'xlam') {
        chatTemplate = 'llama-3.1';
      } else if (modelFamily === 'mistral') {
        chatTemplate = 'mistral';
      } else {
        chatTemplate = 'llama-2';
      }
    }
    
    // Формируем capabilities на основе семейства
    let capabilities = model.capabilities || ['Рассуждение', 'Планирование'];
    if (modelFamily === 'qwen' && (!model.capabilities || model.capabilities.length === 0)) {
      capabilities = ['Мультиязычная', 'Русский язык', 'Математика', 'Код', 'Рассуждение', 'Планирование'];
    } else if (modelFamily === 'saiga' && (!model.capabilities || model.capabilities.length === 0)) {
      capabilities = ['Русский язык', 'Диалог', 'Инструкции'];
    } else if (modelFamily === 'xlam' && (!model.capabilities || model.capabilities.length === 0)) {
      capabilities = ['Инструменты', 'Вызов функций', 'Рассуждение', 'Планирование'];
    }
    
    return {
      id: model.id || `server_${model.name || 'unknown'}`,
      name: model.name || 'Unknown Model',
      parameters: model.parameters || (model.name?.match(/(\d+[Bb])/)?.[0] || '8B'),
      updated: model.lastScanned || (new Date().toISOString().split('T')[0] ?? ''),
      type: model.type || 'GGUF',
      description: model.description || (modelFamily === 'qwen' 
        ? '🐫 Qwen мультиязычная модель с поддержкой русского языка, математики и кода'
        : modelFamily === 'saiga'
        ? '🇷🇺 Saiga русскоязычная модель для диалогов'
        : modelFamily === 'xlam'
        ? '🔧 xLAM-2 модель с поддержкой инструментов'
        : 'Server model'),
      isGGUF: true,
      capabilities: capabilities,
      available: model.available || false,
      active: model.active || false,
      size: model.size || 'N/A',
      rawSize: model.rawSize || 0,
      recommended: model.recommended || false,
      source: 'server' as const,
      modelKey: model.id || '',
      file: model.file || '',
      path: model.path || '',
      supportsTools: model.supportsTools || modelFamily === 'xlam' || false,
      quantType: model.quantType,
      isInstruct: model.isInstruct !== undefined ? model.isInstruct : true,
      chatTemplate: chatTemplate,
      modelFamily,
      relativePath: model.relativePath || '',
      directory: model.directory || '',
      lastScanned: model.lastScanned,
      favorite: model.favorite || false
    };
  }, [detectModelFamily]);

  // Сохранение моделей в кэш
  const cacheModels = useCallback((modelsData: ServerModel[]) => {
    try {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(modelsData));
      localStorage.setItem(MODELS_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache models:', error);
    }
  }, []);

  // Загрузка моделей из кэша
  const loadFromCache = useCallback((): ServerModel[] | null => {
    try {
      const cached = localStorage.getItem(MODELS_CACHE_KEY);
      const timestamp = localStorage.getItem(MODELS_CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached) as ServerModel[];
        }
      }
    } catch (error) {
      console.warn('Failed to load cached models:', error);
    }
    return null;
  }, []);

  // Загрузка моделей с сервера
  const loadModels = useCallback(async (forceRefresh = false) => {
    // Проверяем, нужно ли загружать
    if (loadingInProgressRef.current) {
      console.log('⏳ Загрузка моделей уже в процессе, пропускаем...');
      return;
    }
    
    // Проверяем статус сервера
    if (!isServerOnline(serverStatus)) {
      console.log('⚠️ Сервер не онлайн, пропускаем загрузку моделей');
      return;
    }
    
    // Проверяем кэш
    const now = Date.now();
    if (!forceRefresh && (now - lastLoadTimeRef.current) < CACHE_DURATION) {
      console.log('📦 Используем кэшированные модели (загружены менее 30 секунд назад)');
      return;
    }
    
    // Пробуем загрузить из localStorage кэша
    if (!forceRefresh) {
      const cachedModels = loadFromCache();
      if (cachedModels && cachedModels.length > 0) {
        console.log(`📦 Загружено ${cachedModels.length} моделей из localStorage кэша`);
        const formattedModels = cachedModels.map((model: ServerModel) => formatServerModel(model));
        dispatch(setServerModels(formattedModels));
        lastLoadTimeRef.current = now;
        setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        return;
      }
    }
    
    loadingInProgressRef.current = true;
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      console.log('🔄 Загрузка моделей с сервера...');
      const serverModels = await agentService.getModels(forceRefresh);
      
      if (!isMountedRef.current) return;
      
      if (serverModels.length === 0) {
        dispatch(setError('На сервере не найдено моделей. Проверьте директорию с моделями.'));
      } else {
        console.log(`✅ Загружено ${serverModels.length} моделей с сервера`);
        
        // Логируем найденные Qwen модели
        const qwenModels = serverModels.filter((m: ServerModel) => 
          (m.name || '').toLowerCase().includes('qwen') || 
          (m.file || '').toLowerCase().includes('qwen')
        );
        if (qwenModels.length > 0) {
          console.log(`🐫 Найдено Qwen моделей: ${qwenModels.length}`);
          qwenModels.forEach((m: ServerModel) => {
            console.log(`   • ${m.name} (${m.parameters || 'unknown'}, ${m.size || 'N/A'})`);
          });
        }
        
        const formattedModels = serverModels.map((model: ServerModel) => formatServerModel(model));
        
        dispatch(setServerModels(formattedModels));
        cacheModels(serverModels);
        lastLoadTimeRef.current = Date.now();
        setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки моделей:', error);
      if (isMountedRef.current) {
        dispatch(setError('Не удалось загрузить модели с сервера'));
      }
    } finally {
      if (isMountedRef.current) {
        dispatch(setLoading(false));
      }
      loadingInProgressRef.current = false;
    }
  }, [serverStatus, dispatch, formatServerModel, loadFromCache, cacheModels]);

  // Функция для запуска модели
  const handleStartModel = useCallback(async (modelId: string) => {
    // Если модель уже активна, просто выбираем её
    if (activeModelId === modelId) {
      console.log(`✅ Модель ${modelId} уже активна, просто выбираем`);
      if (onSelectModel) {
        onSelectModel(modelId);
      }
      return;
    }
    
    // Если есть внешний обработчик, используем его
    if (onStartModel) {
      setStartingModelId(modelId);
      setStartingError(null);
      try {
        await onStartModel(modelId);
        // После успешного запуска обновляем активную модель в Redux
        dispatch(setActiveModel(modelId));
        dispatch(setSelectedModelId(modelId));
        
        // Обновляем статус сервера
        const status = await agentService.getServerStatus();
        dispatch(setServerStatus(status));
        
        // Перезагружаем модели для обновления статуса active
        await loadModels(true);
        
        if (onSelectModel) {
          onSelectModel(modelId);
        }
      } catch (error) {
        console.error('Ошибка запуска модели:', error);
        setStartingError(error instanceof Error ? error.message : 'Неизвестная ошибка');
        // Скрываем ошибку через 5 секунд
        setTimeout(() => setStartingError(null), 5000);
      } finally {
        setStartingModelId(null);
      }
      return;
    }
    
    // Иначе используем встроенный запуск
    setStartingModelId(modelId);
    setStartingError(null);
    
    try {
      console.log(`🚀 Запуск модели ${modelId}...`);
      const result = await agentService.startModel(modelId);
      
      if (result.success) {
        console.log(`✅ Модель ${modelId} запущена успешно`);
        dispatch(setActiveModel(modelId));
        dispatch(setSelectedModelId(modelId));
        
        // Обновляем статус сервера
        const status = await agentService.getServerStatus();
        dispatch(setServerStatus(status));
        
        // Перезагружаем модели для обновления статуса active
        await loadModels(true);
        
        if (onSelectModel) {
          onSelectModel(modelId);
        }
      } else {
        throw new Error(result.message || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('❌ Ошибка запуска модели:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setStartingError(errorMessage);
      // Скрываем ошибку через 5 секунд
      setTimeout(() => setStartingError(null), 5000);
    } finally {
      setStartingModelId(null);
    }
  }, [activeModelId, onStartModel, onSelectModel, dispatch, loadModels]);

  // Функция для выбора модели (без запуска)
  const handleSelectModelOnly = useCallback((modelId: string) => {
    if (onSelectModel) {
      onSelectModel(modelId);
    }
    dispatch(setSelectedModelId(modelId));
  }, [onSelectModel, dispatch]);

  // Загружаем модели при монтировании
  useEffect(() => {
    isMountedRef.current = true;
    
    // Немедленная загрузка из кэша для быстрого отображения
    const cachedModels = loadFromCache();
    if (cachedModels && cachedModels.length > 0) {
      const formattedModels = cachedModels.map((model: ServerModel) => formatServerModel(model));
      dispatch(setServerModels(formattedModels));
      setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Загружаем актуальные данные с сервера
    loadModels();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadModels, loadFromCache, formatServerModel, dispatch]);

  // Обновляем время последнего обновления при изменении моделей
  useEffect(() => {
    if (models.length > 0 && !isLoading) {
      setLastUpdateTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [models.length, isLoading]);

  const handleRetry = useCallback(() => {
    loadModels(true);
  }, [loadModels]);

  const handleRefresh = useCallback(() => {
    loadModels(true);
  }, [loadModels]);

  const refreshButton = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium shrink-0',
        'bg-accent hover:bg-border text-foreground disabled:opacity-60'
      )}
      title="Обновить список моделей"
    >
      {isLoading ? 'Обновление…' : 'Обновить'}
    </button>
  );

  // Разделяем модели по категориям
  const serverModels = models.filter(m => m.source === 'server');
  const activeModels = serverModels.filter(m => m.active);
  const availableModels = serverModels.filter(m => m.available && !m.active);
  const unavailableModels = serverModels.filter(m => !m.available && !m.active);
  
  // Сортируем модели: активные, затем рекомендуемые, затем остальные доступные, затем недоступные
  const sortedModels = [...activeModels];
  
  // Добавляем рекомендуемые модели (не активные)
  const recommendedAvailable = availableModels.filter(m => m.recommended);
  const otherAvailable = availableModels.filter(m => !m.recommended);
  sortedModels.push(...recommendedAvailable, ...otherAvailable, ...unavailableModels);

  // Группировка для статистики
  const qwenModels = serverModels.filter(m => m.modelFamily === 'qwen');
  const saigaModels = serverModels.filter(m => m.modelFamily === 'saiga');
  const xlamModels = serverModels.filter(m => m.modelFamily === 'xlam');

  // Показываем загрузку только если нет кэшированных моделей
  if (isLoading && models.length === 0) {
    return (
      <CatalogShell>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-10 h-10 border-2 border-border border-t-foreground rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Загрузка моделей с сервера…</p>
        </div>
      </CatalogShell>
    );
  }

  if (error && models.length === 0) {
    return (
      <CatalogShell headerExtra={refreshButton}>
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <h4 className="text-sm font-semibold text-foreground mb-1">Ошибка загрузки</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md break-words">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="h-8 px-3 rounded-xl text-xs font-medium bg-accent hover:bg-border"
          >
            Повторить попытку
          </button>
        </div>
      </CatalogShell>
    );
  }

  if (!isServerOnline(serverStatus)) {
    return (
      <CatalogShell headerExtra={refreshButton}>
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <h4 className="text-sm font-semibold text-foreground mb-1">Сервер недоступен</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Не удалось подключиться к серверу моделей. Убедитесь, что бэкенд запущен и доступен.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="h-8 px-3 rounded-xl text-xs font-medium bg-accent hover:bg-border"
          >
            Проверить снова
          </button>
        </div>
      </CatalogShell>
    );
  }

  return (
    <CatalogShell headerExtra={refreshButton}>
      <div className="space-y-4 min-w-0">
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm text-muted-foreground break-words">
            {serverModels.length > 0
              ? `Найдено ${serverModels.length} моделей. Нажмите «Запустить», чтобы активировать.`
              : 'Модели не найдены на сервере. Проверьте подключение к бэкенду.'}
          </p>

          {serverModels.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{activeModels.length} активна</span>
              <span>{availableModels.length} доступно</span>
              <span>{unavailableModels.length} недоступно</span>
              {qwenModels.length > 0 && <span>Qwen: {qwenModels.length}</span>}
              {saigaModels.length > 0 && <span>Saiga: {saigaModels.length}</span>}
              {xlamModels.length > 0 && <span>xLAM: {xlamModels.length}</span>}
              {lastUpdateTime && (
                <span className="sm:ml-auto">Обновлено: {lastUpdateTime}</span>
              )}
            </div>
          )}

          {startingError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-sm text-destructive break-words">
              Ошибка запуска: {startingError}
            </div>
          )}
        </div>

        {serverModels.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl px-4 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-1">Модели не найдены</h4>
            <p className="text-sm text-muted-foreground max-w-md mb-4 break-words">
              Не удалось обнаружить модели на сервере. Убедитесь, что бэкенд запущен, есть каталог ~/models/ и файлы .gguf.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="h-8 px-3 rounded-xl text-xs font-medium bg-accent hover:bg-border"
            >
              Проверить снова
            </button>
          </div>
        ) : sortedModels.length > 0 ? (
          <div
            className="grid gap-3 sm:gap-4 min-w-0 [&>*]:min-w-0"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}
          >
            {sortedModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isStarting={startingModelId === model.id}
                onStart={() => handleStartModel(model.id)}
                onSelect={() => handleSelectModelOnly(model.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Нет моделей для отображения
          </div>
        )}
      </div>
    </CatalogShell>
  );
};

export default ModelCatalog;