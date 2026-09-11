// /home/user/projects/studioxlam/src/components/ChatWrapperManager.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { llamaApi, ChatWrapperInfo } from '../services/llamaService';
import type { UnknownRecord } from '../types';
import { ResultPanel } from './ui/result-panel';
import { StatusPill } from './ui/status-pill';
import { LoadingState, EmptyState } from './ui/page-states';
import { toolBtnGhost, toolBtnPrimary, toolCard, toolTitle } from './ui/tool-surface';
import { cn } from '../lib/utils';

interface ChatWrapperManagerProps {
  isDarkMode: boolean;
  onWrapperSelect?: (wrapper: string) => void;
  currentModel?: {
    name?: string;
    supportsTools?: boolean;
    modelFamily?: string;
    chatTemplate?: string;
  };
}

// Статические wrappers для случаев, когда сервер недоступен
const STATIC_WRAPPERS: ChatWrapperInfo[] = [
  {
    name: 'default',
    description: 'Стандартный чат',
    supportsFunctions: false,
    supportsSystemMessage: true,
    supportsTools: false
  },
  {
    name: 'xlam',
    description: 'xLAM-2 формат с поддержкой инструментов',
    supportsFunctions: true,
    supportsSystemMessage: true,
    supportsTools: true,
    requiresModel: 'xlam'
  },
  {
    name: 'json',
    description: 'JSON формат ответов',
    supportsFunctions: false,
    supportsSystemMessage: true,
    supportsTools: false
  },
  {
    name: 'reasoning',
    description: 'Формат с рассуждениями',
    supportsFunctions: false,
    supportsSystemMessage: true,
    supportsTools: false
  },
  {
    name: 'mistral',
    description: 'Специальный формат для Mistral/Saiga моделей',
    supportsFunctions: false,
    supportsSystemMessage: true,
    supportsTools: false,
    requiresModel: 'mistral'
  }
];

const ChatWrapperManager: React.FC<ChatWrapperManagerProps> = ({ 
  isDarkMode, 
  onWrapperSelect,
  currentModel 
}) => {
  const [wrappers, setWrappers] = useState<ChatWrapperInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWrapper, setSelectedWrapper] = useState<string>('');
  const [testResult, setTestResult] = useState<UnknownRecord | null>(null);
  const [testing, setTesting] = useState(false);
  const [wrapperDetails, setWrapperDetails] = useState<Record<string, ChatWrapperInfo>>({});
  
  // ========== НОВЫЕ ФЛАГИ ДЛЯ КОНТРОЛЯ ==========
  const wrappersLoadedRef = useRef(false);
  const initInProgressRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastSelectedWrapperRef = useRef<string>('');
  const lastModelKeyRef = useRef<string>('');

  // Генерируем уникальный ключ для модели
  const modelKey = useMemo(() => {
    if (!currentModel) return '';
    return `${currentModel.name || ''}_${currentModel.supportsTools || false}_${currentModel.modelFamily || ''}`;
  }, [currentModel]);

  // Используем useMemo для фильтрации врапперов
  const filteredWrappers = useMemo(() => {
    if (!wrappers.length) return [];
    if (!currentModel) return wrappers;

    const modelName = currentModel.name?.toLowerCase() || '';
    const isSaiga = currentModel.modelFamily === 'saiga' || modelName.includes('saiga');
    const isMistral = currentModel.modelFamily === 'mistral' || 
                      currentModel.chatTemplate === 'mistral' || 
                      modelName.includes('mistral');
    const supportsTools = currentModel.supportsTools || modelName.includes('xlam');

    let filtered = [...wrappers];

    // Убираем xlam wrapper для моделей без поддержки инструментов
    if (!supportsTools) {
      filtered = filtered.filter(w => w.name !== 'xlam');
    }

    // Для Saiga/Mistral моделей
    if (isSaiga || isMistral) {
      // Убедимся, что xlam wrapper удален, если нет поддержки инструментов
      if (!supportsTools) {
        filtered = filtered.filter(w => w.name !== 'xlam');
      }
      
      // Проверяем, есть ли mistral wrapper
      const hasMistralWrapper = filtered.some(w => w.name === 'mistral');
      
      // Если нет mistral wrapper, добавляем его
      if (!hasMistralWrapper) {
        filtered.push({
          name: 'mistral',
          description: 'Специальный формат для Mistral/Saiga моделей',
          supportsFunctions: false,
          supportsSystemMessage: true,
          supportsTools: false,
          requiresModel: 'mistral'
        });
      }
    }

    // Для xLAM моделей добавляем xlam wrapper если его нет
    if (supportsTools) {
      const hasXlamWrapper = filtered.some(w => w.name === 'xlam');
      if (!hasXlamWrapper) {
        filtered.push({
          name: 'xlam',
          description: 'xLAM-2 формат с поддержкой инструментов',
          supportsFunctions: true,
          supportsSystemMessage: true,
          supportsTools: true,
          requiresModel: 'xlam'
        });
      }
    }

    // Сортируем wrappers для предсказуемого порядка
    const order = ['default', 'xlam', 'mistral', 'json', 'reasoning'];
    filtered.sort((a, b) => {
      const indexA = order.indexOf(a.name);
      const indexB = order.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return filtered;
  }, [wrappers, currentModel]);

  // Функция выбора wrapper по умолчанию
  const getDefaultWrapper = useCallback((
    wrappersList: ChatWrapperInfo[]
  ): string => {
    if (!wrappersList.length) return '';
    
    if (!currentModel) return wrappersList[0]?.name || '';
    
    const modelName = currentModel.name?.toLowerCase() || '';
    const isSaiga = currentModel.modelFamily === 'saiga' || modelName.includes('saiga');
    const isMistral = currentModel.modelFamily === 'mistral' || 
                      currentModel.chatTemplate === 'mistral' || 
                      modelName.includes('mistral');
    
    // Для Saiga/Mistral выбираем mistral wrapper если есть
    if ((isSaiga || isMistral)) {
      const mistralWrapper = wrappersList.find(w => w.name === 'mistral');
      if (mistralWrapper) return 'mistral';
    }
    
    // Для xLAM моделей выбираем xlam wrapper если есть
    if (currentModel.supportsTools || modelName.includes('xlam')) {
      const xlamWrapper = wrappersList.find(w => w.name === 'xlam');
      if (xlamWrapper) return 'xlam';
    }
    
    // Иначе default или первый доступный
    const defaultWrapper = wrappersList.find(w => w.name === 'default');
    if (defaultWrapper) return 'default';
    
    return wrappersList[0]?.name || '';
  }, [currentModel]);

  // Загрузка wrappers с сервера (только один раз)
  const loadWrappers = useCallback(async () => {
    // Предотвращаем повторную загрузку
    if (wrappersLoadedRef.current) {
      console.log('📦 Wrappers уже загружены, пропускаем');
      return;
    }
    
    if (initInProgressRef.current) {
      console.log('⏳ Загрузка wrappers уже в процессе');
      return;
    }
    
    initInProgressRef.current = true;
    
    try {
      setLoading(true);
      const response = await llamaApi.getAllChatWrappers();
      
      if (!isMountedRef.current) return;
      
      if (response.success && response.wrappers && response.wrappers.length > 0) {
        console.log(`✅ Загружено ${response.wrappers.length} wrappers с сервера`);
        setWrappers(response.wrappers);
        wrappersLoadedRef.current = true;
      } else {
        console.log('⚠️ Сервер не вернул wrappers, используем статические');
        setWrappers(STATIC_WRAPPERS);
        wrappersLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading wrappers:', error);
      if (isMountedRef.current) {
        // Используем статические wrappers при ошибке
        setWrappers(STATIC_WRAPPERS);
        wrappersLoadedRef.current = true;
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      initInProgressRef.current = false;
    }
  }, []);

  // Загрузка деталей wrapper (с кэшированием)
  const loadWrapperDetails = useCallback(async (wrapperName: string) => {
    if (!wrapperName) return;
    
    // Проверяем, есть ли уже детали в кэше
    if (wrapperDetails[wrapperName]) {
      return;
    }
    
    try {
      const response = await llamaApi.getChatWrapperInfo(wrapperName);
      if (isMountedRef.current && response.success && response.wrapper) {
        const wrapper = response.wrapper;
        setWrapperDetails(prev => ({
          ...prev,
          [wrapperName]: wrapper
        }));
      }
    } catch (error) {
      console.error('Error loading wrapper details:', error);
    }
  }, [wrapperDetails]);

  // Инициализация - загружаем wrappers только один раз
  useEffect(() => {
    isMountedRef.current = true;
    
    // Загружаем wrappers при монтировании
    if (!wrappersLoadedRef.current && !initInProgressRef.current) {
      loadWrappers();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadWrappers]);

  // Эффект для выбора wrapper при изменении фильтрованных wrappers или модели
  useEffect(() => {
    // Проверяем, изменилась ли модель
    const modelChanged = lastModelKeyRef.current !== modelKey;
    
    if (modelChanged) {
      lastModelKeyRef.current = modelKey;
      // При смене модели сбрасываем выбранный wrapper, чтобы выбрать новый по умолчанию
      setSelectedWrapper('');
      lastSelectedWrapperRef.current = '';
    }
    
    if (filteredWrappers.length > 0 && !selectedWrapper) {
      const defaultWrapper = getDefaultWrapper(filteredWrappers);
      if (defaultWrapper && defaultWrapper !== selectedWrapper) {
        console.log(`🎯 Выбран wrapper по умолчанию: ${defaultWrapper} для модели ${currentModel?.name || 'unknown'}`);
        setSelectedWrapper(defaultWrapper);
        lastSelectedWrapperRef.current = defaultWrapper;
        if (onWrapperSelect) {
          onWrapperSelect(defaultWrapper);
        }
        // Загружаем детали для выбранного враппера
        loadWrapperDetails(defaultWrapper);
      }
    } else if (filteredWrappers.length === 0 && selectedWrapper) {
      setSelectedWrapper('');
      lastSelectedWrapperRef.current = '';
      if (onWrapperSelect) {
        onWrapperSelect('');
      }
    }
  }, [filteredWrappers, getDefaultWrapper, onWrapperSelect, selectedWrapper, currentModel?.name, modelKey, loadWrapperDetails]);

  const handleWrapperSelect = useCallback((wrapperName: string) => {
    if (wrapperName === selectedWrapper) return;
    
    console.log(`🔄 Выбран wrapper: ${wrapperName}`);
    setSelectedWrapper(wrapperName);
    lastSelectedWrapperRef.current = wrapperName;
    if (onWrapperSelect) {
      onWrapperSelect(wrapperName);
    }
    loadWrapperDetails(wrapperName);
  }, [selectedWrapper, onWrapperSelect, loadWrapperDetails]);

  const handleTestWrapper = useCallback(async () => {
    if (!selectedWrapper) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const modelName = currentModel?.name?.toLowerCase() || '';
      const isSaiga = currentModel?.modelFamily === 'saiga' || modelName.includes('saiga');
      
      const testPrompt = isSaiga 
        ? 'Привет! Расскажи о себе на русском языке.' 
        : 'Привет! Расскажи о себе.';
      
      const systemPrompt = isSaiga
        ? 'Ты полезный ассистент Saiga. Отвечай на русском языке вежливо и подробно.'
        : 'Ты полезный ассистент. Отвечай вежливо и подробно.';
      
      const response = await llamaApi.testChatWrapper({
        wrapper: selectedWrapper,
        history: [
          { role: 'user', content: testPrompt },
          { role: 'assistant', content: 'Привет! Я готов помочь вам с различными задачами.' }
        ],
        systemPrompt
      });
      setTestResult(response);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  }, [selectedWrapper, currentModel]);

  const currentWrapperInfo = selectedWrapper ? wrapperDetails[selectedWrapper] : null;

  // Отображаем подсказку если есть невидимые wrappers
  const hiddenCount = wrappers.length - filteredWrappers.length;

  const handleRefresh = useCallback(() => {
    wrappersLoadedRef.current = false;
    loadWrappers();
  }, [loadWrappers]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h3 className={toolTitle}>Обёртки чата</h3>
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {hiddenCount} скрыто — не совместимо с текущей моделью
            </p>
          )}
          {wrappersLoadedRef.current && wrappers.length === STATIC_WRAPPERS.length && (
            <p className="text-xs text-muted-foreground mt-1">Статический список: сервер не ответил</p>
          )}
        </div>
        <button type="button" onClick={handleRefresh} className={toolBtnGhost} disabled={loading}>
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {loading && wrappers.length === 0 ? (
        <LoadingState message="Загрузка обёрток…" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
            {filteredWrappers.map((wrapper) => (
              <button
                key={wrapper.name}
                type="button"
                className={cn(
                  toolCard,
                  'text-left cursor-pointer transition-colors',
                  selectedWrapper === wrapper.name
                    ? 'border-primary/30 bg-primary/5'
                    : 'hover:bg-accent/40'
                )}
                onClick={() => handleWrapperSelect(wrapper.name)}
              >
                <div className="flex justify-between items-start gap-2 mb-2 min-w-0">
                  <h4 className="text-sm font-medium truncate">{wrapper.name}</h4>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {wrapper.supportsFunctions && <StatusPill variant="success">функции</StatusPill>}
                    {wrapper.supportsTools && <StatusPill variant="warning">инструменты</StatusPill>}
                    {wrapper.supportsSystemMessage && <StatusPill variant="purple">система</StatusPill>}
                    {wrapper.requiresModel && <StatusPill variant="neutral">{wrapper.requiresModel}</StatusPill>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 break-words">{wrapper.description}</p>
              </button>
            ))}
          </div>

          {filteredWrappers.length === 0 && !loading && (
            <EmptyState
              message="Нет обёрток для текущей модели"
              action={
                <button type="button" onClick={handleRefresh} className={toolBtnGhost}>
                  Повторить
                </button>
              }
            />
          )}

          {currentWrapperInfo && (
            <div className={toolCard}>
              <h4 className="text-sm font-medium mb-1">{currentWrapperInfo.name}</h4>
              <p className="text-xs text-muted-foreground mb-3 break-words">{currentWrapperInfo.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <StatusPill variant={currentWrapperInfo.supportsFunctions ? 'success' : 'neutral'}>
                  функции: {currentWrapperInfo.supportsFunctions ? 'да' : 'нет'}
                </StatusPill>
                <StatusPill variant={currentWrapperInfo.supportsTools ? 'success' : 'neutral'}>
                  инструменты: {currentWrapperInfo.supportsTools ? 'да' : 'нет'}
                </StatusPill>
                <StatusPill variant={currentWrapperInfo.supportsSystemMessage ? 'success' : 'neutral'}>
                  системные: {currentWrapperInfo.supportsSystemMessage ? 'да' : 'нет'}
                </StatusPill>
              </div>
            </div>
          )}

          {selectedWrapper && (
            <div>
              <button
                type="button"
                onClick={() => void handleTestWrapper()}
                disabled={testing}
                className={toolBtnPrimary}
              >
                {testing ? 'Тест…' : 'Протестировать'}
              </button>
            </div>
          )}

          {testResult && (
            <ResultPanel
              success={Boolean(testResult.success)}
              title={testResult.success ? 'Тест пройден' : 'Тест не пройден'}
              className="rounded-2xl p-3"
            >
              <pre className="text-xs overflow-auto max-h-60 mt-2 break-all scroll-clip">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </ResultPanel>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWrapperManager;
