// /home/user/projects/studioxlam/src/components/AgentLab.tsx
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChatMarkdown, StreamingChatMarkdown } from './markdown/ChatMarkdown';
import { chatSyncService, ChatData, toChatMessages } from '../services/chatSyncService';
import agentService, { 
  ModelControlResponse,
  ChatWrapperInfo,
  XlamToolDefinition,
  DEFAULT_TOOLS,
  ChatMessage,
  GenerationOptions
} from '../services/agentService';
import type { ChatImageAttachment, XLAMModel } from '../types';
import type { AppDispatch, RootState } from '../store/store';
import { addMessage, setLoading, clearHistory, updateLastMessage, finalizeLastMessage } from '../store/chatSlice';
import { saveUserSettings } from '../store/authSlice';
import { setModelOperation, setServerStatus } from '../store/appSlice';
import { setSelectedModelId, setActiveModel } from '../store/modelsSlice';
import { confirmDialog } from '../services/dialogService';
import { showErrorToast } from '../services/toastService';
import { IconButton } from './ui/icon-button';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';
import { MenuPopover } from './ui/menu-popover';
import { isWorkspaceOverlay, WORKSPACE_PHONE_MQ } from '../utils/workspaceLayout';
import { formatLoadedModelLabel, isQwenThinkingModel } from '../utils/modelDisplay';

// Импорт компонентов инструментов
import AdvancedSettings from './AdvancedSettings';
import SystemInfoPanel from './SystemInfoPanel';
import GrammarBuilder from './GrammarBuilder';
import EmbeddingTools from './EmbeddingTools';
import RankingTool from './RankingTool';
import FunctionDocumentationTool from './FunctionDocumentationTool';
import ModelInsightsPanel from './ModelInsightsPanel';
import ChatWrapperManager from './ChatWrapperManager';
import { ChatList } from './ChatList';
import { AssistantToolsMenu } from './AssistantToolsMenu';
import { PanelScrollArea } from './ui/panel-scroll-area';
import { splitThinkingContent, stripThinkingTags } from '../utils/thinkingContent';
import { usePanelScroll, useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';
import { filterToolsForRole, isAdmin, isEmployee } from '../utils/auth';
import { ModelLaunchDialog } from './ModelLaunchDialog';
import type { LoadLaunchOptions } from '../services/llamaLaunchService';
import {
  loadLocalToolPrefs,
  mergeChatSettings,
  readChatUserSettings,
  saveLocalToolPrefs,
  toolsEnabledFromSettings,
  type AssistantQwenMode,
} from '../utils/assistantChatSettings';
import {
  collectVisionFiles,
  persistableVisionContent,
  VISION_ACCEPT,
} from '../utils/chatVision';
import {
  createEmptyGrammarSelection,
  grammarSelectionLabel,
  grammarSelectionToApiFields,
  isGrammarActive,
  type GrammarSelection,
} from '../utils/grammarUtils';

interface AgentLabProps {
  selectedModel?: XLAMModel | null;
}

type ConnectionStatus = 'checking' | 'online' | 'error' | 'offline';
type ActiveTool = 'chat' | 'tools' | 'grammar' | 'embedding' | 'insights' | 'ranking' | 'functions' | 'advanced' | 'system' | 'settings' | 'wrappers';
type QwenMode = AssistantQwenMode;

// ========== ФИНАЛЬНЫЕ ОПТИМИЗИРОВАННЫЕ СИСТЕМНЫЕ ПРОМПТЫ ==========
const SYSTEM_PROMPT_PRESETS = [
  {
    name: 'Default',
    value: `Ты - полезный AI ассистент Barsseek. Отвечай на русском языке четко, по делу и информативно. Будь дружелюбным и профессиональным.`
  },
  {
    name: 'Detailed',
    value: `Ты - подробный AI ассистент Barsseek. Отвечай развернуто, с примерами и объяснениями. Структурируй ответы с помощью списков и абзацев.`
  },
  {
    name: 'Technical',
    value: `Ты - технический эксперт. Отвечай точно, используй правильные термины, приводи примеры и объяснения шаг за шагом.`
  },
  {
    name: 'Saiga Optimal',
    value: `Ты — Сайга, умный, точный и честный русскоязычный AI-помощник.

Отвечай естественно, по делу и без лишней воды.
Если тема сложная — объясняй шаг за шагом, используй списки и примеры.
Если не знаешь ответа — честно признайся.
Отвечай только на русском языке, спокойным и профессиональным тоном.`
  },
  {
    name: 'xLAM Tools & CRM',
    value: `Ты - AI ассистент Barsseek с поддержкой инструментов (xLAM-2) и интеграцией с Bitrix24.
Отвечай на русском языке четко и по делу.
Используй инструменты только когда это необходимо для точного ответа.
Будь полезным и профессиональным.`
  },
  {
    name: 'Qwen Thinking',
    value: `Ты — AI-ассистент. Отвечай на русском языке.
Используй режим рассуждений для сложных задач: сначала продумай ответ в блоке <think>, затем дай финальный ответ.
Будь точным, информативным и полезным.`
  }
];

const DEFAULT_SYSTEM_PROMPT = SYSTEM_PROMPT_PRESETS[0]?.value ?? '';
const SAIGA_OPTIMAL_PROMPT = SYSTEM_PROMPT_PRESETS[3]?.value ?? DEFAULT_SYSTEM_PROMPT;
const XLAM_TOOLS_PROMPT = SYSTEM_PROMPT_PRESETS[4]?.value ?? DEFAULT_SYSTEM_PROMPT;

// Функция для определения промпта на основе модели
const getSystemPromptForModel = (model: XLAMModel | null | undefined) => {
  if (!model) return DEFAULT_SYSTEM_PROMPT;

  if (isQwenThinkingModel(model)) {
    const preset = SYSTEM_PROMPT_PRESETS.find((p) => p.name === 'Qwen Thinking')?.value || DEFAULT_SYSTEM_PROMPT;
    const label = formatLoadedModelLabel(model);
    return label ? preset.replace('Ты — AI-ассистент.', `Ты — AI-ассистент на базе ${label}.`) : preset;
  }

  if (model.supportsTools || model.modelFamily === 'xlam') {
    return SYSTEM_PROMPT_PRESETS.find(p => p.name === 'xLAM Tools & CRM')?.value || XLAM_TOOLS_PROMPT;
  }

  if (model.modelFamily === 'saiga' || model.name?.toLowerCase().includes('saiga')) {
    return SYSTEM_PROMPT_PRESETS.find(p => p.name === 'Saiga Optimal')?.value || SAIGA_OPTIMAL_PROMPT;
  }

  return DEFAULT_SYSTEM_PROMPT;
};

// Функция для получения оптимальных параметров генерации
const getGenerationOptionsForModel = (model: XLAMModel | null | undefined): Partial<GenerationOptions> => {
  if (!model) return { temperature: 0.72, repeatPenalty: 1.12 };

  if (isQwenThinkingModel(model)) {
    return {
      temperature: 1.0,
      maxTokens: 32768,
      repeatPenalty: 1.0,
      topP: 0.95,
      topK: 20,
      enableThinking: true
    };
  }

  if (model.modelFamily === 'saiga' || model.name?.toLowerCase().includes('saiga')) {
    return {
      temperature: 0.70,
      maxTokens: 2048,
      repeatPenalty: 1.14,
      topP: 0.90,
      topK: 50
    };
  }

  if (model.supportsTools || model.modelFamily === 'xlam') {
    return {
      temperature: 0.70,
      maxTokens: 4096,
      repeatPenalty: 1.12,
      topP: 0.90,
      topK: 40
    };
  }

  return {
    temperature: 0.72,
    maxTokens: 2048,
    repeatPenalty: 1.12,
    topP: 0.90,
    topK: 40
  };
};

// Функция пост-обработки ответов
const postProcessResponse = (text: string, modelFamily?: string, originalPrompt?: string, enableThinking?: boolean): string => {
  if (!text) return text;
  
  let processed = text;
  
  if (modelFamily === 'qwen' && !enableThinking) {
    processed = stripThinkingTags(processed);
  }
  
  const tagsToRemove = [
    /\[\/INST\]/gi, /\[INST\]/gi, /<\/?s>/gi, /<s>/gi, /<\/s>/gi,
    /<\|im_end\|>/gi, /<\|im_start\|>/gi, /<\|end_of_text\|>/gi,
    /<\|begin_of_text\|>/gi, /<\|eot_id\|>/gi,
    /<\|start_header_id\|>[^>]*\|>/g, /<\|end_header_id\|>/g,
    /\*\*/g
  ];
  
  tagsToRemove.forEach(pattern => {
    processed = processed.replace(pattern, '');
  });
  
  if (modelFamily === 'saiga') {
    const prefixesToRemove = [
      /^assistant:\s*/i, /^Ассистент:\s*/i, /^Ответ:\s*/i, /^Saiga:\s*/i
    ];
    
    prefixesToRemove.forEach(prefix => {
      processed = processed.replace(prefix, '');
    });
    processed = processed.trim();
    
    if (originalPrompt && processed.length > 50) {
      const promptStart = originalPrompt.slice(0, 50).toLowerCase();
      const responseStart = processed.slice(0, 50).toLowerCase();
      if (responseStart.includes(promptStart) || promptStart.includes(responseStart.slice(0, 30))) {
        const firstSpace = processed.indexOf(' ', 40);
        if (firstSpace > 0 && firstSpace < 150) {
          processed = processed.slice(firstSpace + 1).trim();
        }
      }
    }
  }
  
  processed = processed
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
  
  if (processed.length === 0) {
    return "Извините, я не смог сформулировать ответ. Пожалуйста, переформулируйте вопрос.";
  }
  
  return processed;
};

// Форматированное сообщение с профессиональным выводом
const FormattedMessageBase: React.FC<{
  content: string;
  isDarkMode: boolean;
  isUser?: boolean;
  isStreaming?: boolean;
  images?: ChatImageAttachment[];
}> = ({ 
  content, 
  isDarkMode, 
  isUser = false,
  isStreaming = false,
  images,
}) => {
  const imagePreviews = images?.filter((image) => image.previewUrl) ?? [];
  const imageBlock = imagePreviews.length > 0 ? (
    <div className="mb-2 flex flex-wrap gap-2">
      {imagePreviews.map((image, index) => (
        <img
          key={`${image.name}-${index}`}
          src={image.previewUrl}
          alt={image.name || 'Изображение'}
          className="max-h-40 max-w-[220px] rounded-xl object-cover border border-white/20"
        />
      ))}
    </div>
  ) : null;

  if (isUser) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {imageBlock}
        {content}
      </div>
    );
  }

  if (!content || content.trim() === '') {
    return (
      <div className="text-muted-foreground italic">
        {isStreaming ? 'Ожидание первого токена...' : 'Пустой ответ от модели'}
        {isStreaming && <span className="inline-block ml-1 animate-pulse">▊</span>}
      </div>
    );
  }

  const { thinking: thinkingContent, answer: answerContent, hasThinkingBlock, isThinkingComplete } =
    splitThinkingContent(content);
  const hasThinking = hasThinkingBlock && Boolean(thinkingContent);
  const markdownText = hasThinkingBlock ? answerContent : content;
  const answerStreaming = isStreaming && (!hasThinking || isThinkingComplete);

  return (
    <div className={hasThinking ? 'space-y-3' : undefined}>
      {hasThinking && (
        <details className="text-sm" open={isStreaming && !isThinkingComplete}>
          <summary className="cursor-pointer list-none flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
            <span>🧠</span>
            <span>Размышление</span>
            {isStreaming && !isThinkingComplete && (
              <span className="text-xs text-purple-500 animate-pulse">пишется...</span>
            )}
          </summary>
          <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg text-purple-900 dark:text-purple-100 text-sm italic whitespace-pre-wrap break-words">
            {thinkingContent}
            {isStreaming && !isThinkingComplete && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-purple-500 animate-pulse align-middle" />
            )}
          </div>
        </details>
      )}
      {markdownText ? (
        isStreaming ? (
          <StreamingChatMarkdown content={markdownText} isDarkMode={isDarkMode} />
        ) : (
          <ChatMarkdown content={markdownText} isDarkMode={isDarkMode} />
        )
      ) : (
        isStreaming && hasThinking && !isThinkingComplete && (
          <p className="text-xs text-muted-foreground italic">Ответ появится после размышления...</p>
        )
      )}
      {answerStreaming && <span className="inline-block ml-1 animate-pulse text-blue-500">▊</span>}
    </div>
  );
};

// Без memo каждый чанк перерисовывает всю историю через ReactMarkdown.
const FormattedMessage = React.memo(FormattedMessageBase);

// Иконки с улучшенными SVG
const Icon = ({ children, className = "w-5 h-5" }: { children: React.ReactNode, className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {children}
  </svg>
);

const ChatIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></Icon>;
const SettingsIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></Icon>;
const SystemIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></Icon>;
const SendIcon = () => <Icon className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></Icon>;
const AttachIcon = () => (
  <Icon className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </Icon>
);
const GrammarIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></Icon>;
const EmbeddingIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></Icon>;
const RankingIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></Icon>;
const FunctionsIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></Icon>;
const InsightsIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></Icon>;
const PlayIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></Icon>;
const StopIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></Icon>;
const SwitchIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></Icon>;
const ClearIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></Icon>;
const WrappersIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></Icon>;
const PanelLeftIcon = () => (
  <Icon className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16" />
  </Icon>
);
const MoreIcon = () => (
  <Icon className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h.01M12 12h.01M12 18h.01" />
  </Icon>
);

const ThinkingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const StopStreamingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2} />
  </svg>
);

const AgentLab: React.FC<AgentLabProps> = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux Selectors
  const availableModels = useSelector((state: RootState) => state.models.models);
  const selectedModelId = useSelector((state: RootState) => state.models.selectedModelId);
  const activeModelId = useSelector((state: RootState) => state.models.activeModel);
  const serverStatus = useSelector((state: RootState) => state.app.serverStatus);
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const loading = useSelector((state: RootState) => state.chat.isLoading);
  const productMode = useSelector((state: RootState) => isEmployee(state.auth.user));
  const userIsAdmin = useSelector((state: RootState) => isAdmin(state.auth.user));
  const authSettings = useSelector((state: RootState) => state.auth.settings);
  const authUserId = useSelector((state: RootState) => state.auth.user?.id);
  
  // Helper functions
  const getModelById = useCallback((modelId: string) => {
    return availableModels.find(model => model.id === modelId);
  }, [availableModels]);
  
  const activeModel = getModelById(activeModelId || '');
  const selectedModelInfo = getModelById(selectedModelId || '');
  const currentModel = activeModel || selectedModelInfo;
  const chatHistoryKey = currentModel?.id || selectedModelId || activeModelId || 'default';
  const currentModelId = chatHistoryKey;
  const messages = useSelector((state: RootState) =>
    state.chat.histories[chatHistoryKey] || []
  );
  
  const isSaigaModel = currentModel?.modelFamily === 'saiga' || 
                       currentModel?.name?.toLowerCase().includes('saiga');
  const isXLAMModel = currentModel?.supportsTools || 
                      currentModel?.modelFamily === 'xlam' ||
                      currentModel?.name?.toLowerCase().includes('xlam');
  
  const isQwen36Model = isQwenThinkingModel(currentModel);
  
  // State for Qwen3.6
  const [qwenMode, setQwenMode] = useState<QwenMode>('auto');
  const [selectedToolNames, setSelectedToolNames] = useState<string[]>(
    () => loadLocalToolPrefs().selectedTools ?? []
  );
  const [requireTools, setRequireTools] = useState(
    () => loadLocalToolPrefs().requireTools ?? false
  );
  const settingsAppliedUserRef = useRef('');
  const lastSavedChatSettingsRef = useRef('');
  const authSettingsRef = useRef(authSettings);
  authSettingsRef.current = authSettings;
  const {
    activeTab: activeTool,
    setActiveTab: setActiveTool,
    getToggle,
    setToggle,
  } = useWorkspacePanel(PANEL_IDS.AGENT_LAB, 'chat');
  const activeToolId = activeTool as ActiveTool;
  const enableThinking = getToggle('enableThinking', false);
  const preserveThinking = getToggle('preserveThinking', false);
  const showSettings = getToggle('showSettings', false);
  const showMobileMenu = getToggle('showMobileMenu', false);
  const useTools = getToggle('useTools', false);
  const setEnableThinking = (value: boolean) => setToggle('enableThinking', value);
  const setPreserveThinking = (value: boolean) => setToggle('preserveThinking', value);
  const setShowSettings = (value: boolean) => setToggle('showSettings', value);
  const setShowMobileMenu = (value: boolean) => setToggle('showMobileMenu', value);
  const setUseTools = (value: boolean) => setToggle('useTools', value);

  useEffect(() => {
    if (productMode && activeTool !== 'chat') {
      setActiveTool('chat');
    }
  }, [productMode, activeTool, setActiveTool]);

  // State
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const [visionEnabled, setVisionEnabled] = useState(false);
  const [isModelActionLoading, setIsModelActionLoading] = useState(false);
  const [launchDialogModelId, setLaunchDialogModelId] = useState<string | null>(null);
  const [, setLastOperationResult] = useState<ModelControlResponse | null>(null);
  const [, setAvailableWrappers] = useState<ChatWrapperInfo[]>([]);
  const [selectedWrapper, setSelectedWrapper] = useState<string>('default');
  const [advancedOptions, setAdvancedOptions] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  });
  const [sessionId, setSessionId] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [, setSelectedPromptPreset] = useState<string>('Default');
  const [availableTools, setAvailableTools] = useState<XlamToolDefinition[]>(() =>
    filterToolsForRole(DEFAULT_TOOLS, productMode ? 'employee' : undefined)
  );
  const [grammarSelection, setGrammarSelection] = useState<GrammarSelection>(createEmptyGrammarSelection());

  useEffect(() => {
    if (!authUserId) {
      settingsAppliedUserRef.current = '';
      return;
    }
    if (!authSettings) return;
    if (settingsAppliedUserRef.current === authUserId) return;
    settingsAppliedUserRef.current = authUserId;

    const chat = readChatUserSettings(authSettings);
    if (typeof chat.systemPrompt === 'string' && chat.systemPrompt.trim()) {
      setSystemPrompt(chat.systemPrompt);
    }
    setAdvancedOptions((prev) => ({
      ...prev,
      ...(typeof chat.temperature === 'number' ? { temperature: chat.temperature } : {}),
      ...(typeof chat.maxTokens === 'number' ? { maxTokens: chat.maxTokens } : {}),
    }));
    if (chat.mode) setQwenMode(chat.mode);
    if (typeof chat.enableThinking === 'boolean') setEnableThinking(chat.enableThinking);
    const toolsOn = toolsEnabledFromSettings(chat);
    if (typeof toolsOn === 'boolean') setUseTools(toolsOn);
    if (chat.selectedTools) setSelectedToolNames(chat.selectedTools);
    if (typeof chat.requireTools === 'boolean') setRequireTools(chat.requireTools);
    lastSavedChatSettingsRef.current = JSON.stringify({
      systemPrompt: chat.systemPrompt ?? '',
      temperature: chat.temperature,
      maxTokens: chat.maxTokens,
      enableThinking: chat.enableThinking,
      mode: chat.mode,
      use_tools: toolsOn ?? false,
      useTools: toolsOn ?? false,
      selectedTools: chat.selectedTools ?? [],
      requireTools: chat.requireTools ?? false,
    });
  }, [authSettings, authUserId, setEnableThinking, setUseTools]);

  useEffect(() => {
    saveLocalToolPrefs(selectedToolNames, requireTools);
  }, [selectedToolNames, requireTools]);

  useEffect(() => {
    if (!authUserId) return;
    const payload = {
      systemPrompt,
      temperature: advancedOptions.temperature,
      maxTokens: advancedOptions.maxTokens,
      enableThinking,
      mode: qwenMode,
      use_tools: useTools,
      useTools,
      selectedTools: selectedToolNames,
      requireTools,
    };
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSavedChatSettingsRef.current) return;
    const timer = window.setTimeout(() => {
      lastSavedChatSettingsRef.current = snapshot;
      void dispatch(saveUserSettings(mergeChatSettings(authSettingsRef.current, payload)));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    dispatch,
    authUserId,
    systemPrompt,
    advancedOptions.temperature,
    advancedOptions.maxTokens,
    enableThinking,
    qwenMode,
    useTools,
    selectedToolNames,
    requireTools,
  ]);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentChatRef = useRef<ChatData | null>(null);
  const messagesRef = useRef(messages);
  const lastSavedMessagesRef = useRef<string>('');
  
  // Состояния для синхронизации чатов
  const [currentChat, setCurrentChat] = useState<ChatData | null>(null);
  const [availableChats, setAvailableChats] = useState<ChatData[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [chatsRefreshing, setChatsRefreshing] = useState(false);
  const chatsRefreshingRef = useRef(false);
  const showChatList = getToggle('showChatList', true);
  const setShowChatList = (value: boolean) => setToggle('showChatList', value);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLButtonElement>(null);
  const closeChatListIfMobile = () => {
    if (isWorkspaceOverlay()) setShowChatList(false);
  };
  
  // Флаги для контроля инициализации
  const [isInitialized, setIsInitialized] = useState(false);
  const lastInitParamsRef = useRef({
    serverReady: false,
    modelId: '',
    sessionId: '',
    wrapper: ''
  });
  const initInProgressRef = useRef(false);
  const wrappersLoadedRef = useRef(false);
  const toolsLoadedRef = useRef(false);
  const sessionCreatedRef = useRef(false);
  const isChatLoadedRef = useRef(false);
  
  const scrollRef = usePanelScroll(PANEL_IDS.AGENT_LAB, 'chat');
  const stickToBottomRef = useRef(true);
  const isMountedRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sessionCreationInProgressRef = useRef(false);
  
  // Connection status
  const connectionStatus: ConnectionStatus =
    serverStatus?.status === 'online'
      ? 'online'
      : serverStatus?.status === 'checking'
        ? 'checking'
        : serverStatus?.status === 'offline'
          ? 'offline'
          : 'error';
  const isServerReady = serverStatus?.serverReady || false;

  useEffect(() => {
    let cancelled = false;

    const refreshVision = async () => {
      if (!isServerReady) {
        if (!cancelled) setVisionEnabled(false);
        return;
      }
      const enabled = await agentService.getVisionStatus();
      if (!cancelled) setVisionEnabled(enabled);
    };

    void refreshVision();
    const timer = window.setInterval(() => {
      void refreshVision();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isServerReady, currentModelId]);

  useEffect(() => {
    if (visionEnabled) return;
    setPendingImages((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, [visionEnabled]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const checkServerAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const status = await agentService.getServerStatus();
      return status?.serverReady === true;
    } catch (error) {
      console.debug('Сервер недоступен:', error);
      return false;
    }
  }, []);

  // Загрузка чатов при старте
  const loadChats = useCallback(async () => {
    if (chatsRefreshingRef.current) return;
    chatsRefreshingRef.current = true;
    setChatsRefreshing(true);
    try {
      const { chats, active } = await chatSyncService.restoreChatList(
        chatSyncService.getLastActiveChat()
      );
      const validChats = chats.filter(
        (chat) => chat && typeof chat === 'object' && chat.id && Array.isArray(chat.messages)
      );
      setAvailableChats(validChats);
      setChatsLoaded(true);

      if (validChats.length === 0) {
        const newChat = chatSyncService.createNewChat(currentModelId, undefined, 'Новый чат');
        newChat.sessionId = newChat.id;
        newChat.systemPrompt = systemPrompt;
        newChat.chatWrapper = selectedWrapper;
        await chatSyncService.persistChat(newChat, true);
        setAvailableChats([newChat]);
        setCurrentChat(newChat);
        currentChatRef.current = newChat;
        setSessionId(newChat.id);
        newChat.sessionId = newChat.id;
        lastSavedMessagesRef.current = '[]';
        stickToBottomRef.current = true;
        chatSyncService.setLastActiveChat(newChat.id);
        if (currentModelId) dispatch(clearHistory(currentModelId));
        isChatLoadedRef.current = true;
        return;
      }

      const openChat = active && validChats.some((chat) => chat.id === active.id) ? active : validChats[0] ?? null;
      if (openChat) {
        setCurrentChat(openChat);
        currentChatRef.current = openChat;
        setSessionId(openChat.id);
        lastSavedMessagesRef.current = JSON.stringify(openChat.messages ?? []);
        stickToBottomRef.current = true;
        chatSyncService.setLastActiveChat(openChat.id);

        if (currentModelId) {
          dispatch(clearHistory(currentModelId));
          for (const msg of openChat.messages ?? []) {
            if (msg?.content && msg.role) {
              dispatch(addMessage({ modelId: currentModelId, message: msg }));
            }
          }
        }
      }

    isChatLoadedRef.current = true;
    } catch (error) {
      console.error('Ошибка восстановления чатов:', error);
      setAvailableChats([]);
      setChatsLoaded(true);
      isChatLoadedRef.current = true;
    } finally {
      chatsRefreshingRef.current = false;
      setChatsRefreshing(false);
    }
  }, [currentModelId, dispatch, systemPrompt, selectedWrapper]);

  const refreshChatList = useCallback(async () => {
    if (chatsRefreshingRef.current || abortControllerRef.current) return;
    chatsRefreshingRef.current = true;
    setChatsRefreshing(true);
    try {
      const summaries = await chatSyncService.listChatSummaries();
      const open = currentChatRef.current;
      const live = messagesRef.current;
      setAvailableChats((prev) => {
        const prevById = new Map(prev.map((chat) => [chat.id, chat]));
        const next = summaries.map((summary) => {
          const existing = prevById.get(summary.id);
          const base: ChatData = existing ?? {
            id: summary.id,
            title: summary.title ?? 'Новый чат',
            modelId: summary.modelId ?? '',
            sessionId: summary.sessionId ?? summary.id,
            messages: [],
            messageCount: summary.messageCount ?? 0,
            systemPrompt: '',
            chatWrapper: 'default',
            createdAt: summary.createdAt,
            updatedAt: summary.updatedAt,
          };
          if (open && summary.id === open.id) {
            return {
              ...base,
              title: summary.title ?? base.title,
              updatedAt: summary.updatedAt ?? base.updatedAt,
              messageCount: live.length || summary.messageCount || base.messageCount,
              messages: live.length ? live : base.messages,
              sessionId: open.sessionId ?? base.sessionId,
            };
          }
          return {
            ...base,
            title: summary.title ?? base.title,
            updatedAt: summary.updatedAt ?? base.updatedAt,
            messageCount: summary.messageCount ?? base.messageCount ?? base.messages?.length ?? 0,
          };
        });
        if (open && !next.some((chat) => chat.id === open.id)) {
          next.unshift({
            ...open,
            title: open.title,
            updatedAt: open.updatedAt,
            messages: live.length ? live : open.messages,
            messageCount: live.length || open.messageCount || 0,
          });
        }
        return next;
      });
      setChatsLoaded(true);
    } catch (error) {
      console.error('Ошибка обновления списка чатов:', error);
    } finally {
      chatsRefreshingRef.current = false;
      setChatsRefreshing(false);
    }
  }, []);

  const saveCurrentChat = useCallback(async () => {
    const chat = currentChatRef.current;
    const liveMessages = messagesRef.current;
    if (!chat || liveMessages.length === 0) return;
    if (chatSyncService.isDeletedChatId(chat.id)) return;

    const messagesSnapshot = JSON.stringify(liveMessages);
    if (messagesSnapshot === lastSavedMessagesRef.current) return;

    const savedId = chat.id;
    const updatedChat = {
      ...chat,
      messages: liveMessages,
      messageCount: liveMessages.length,
      updatedAt: new Date().toISOString(),
    };

    lastSavedMessagesRef.current = messagesSnapshot;
    currentChatRef.current = updatedChat;

    chatSyncService.saveChat(updatedChat);

    setAvailableChats((prev) =>
      prev.map((c) => (c.id === savedId ? updatedChat : c))
    );
    setCurrentChat((prev) => (prev?.id === savedId ? updatedChat : prev));
    chatSyncService.setLastActiveChat(savedId);
  }, []);

  const createNewChat = useCallback(async () => {
    const newChat = chatSyncService.createNewChat(currentModelId, undefined, 'Новый чат');
    newChat.sessionId = newChat.id;
    newChat.systemPrompt = systemPrompt;
    newChat.chatWrapper = selectedWrapper;
    setSessionId(newChat.id);
    
    await chatSyncService.persistChat(newChat, true);
    
    setCurrentChat(newChat);
    currentChatRef.current = newChat;
    lastSavedMessagesRef.current = '[]';
    stickToBottomRef.current = true;
    setAvailableChats(prev => [newChat, ...prev.filter((c) => c.id !== newChat.id)]);
    
    dispatch(clearHistory(currentModelId));
    
    chatSyncService.setLastActiveChat(newChat.id);
    closeChatListIfMobile();
  }, [currentModelId, systemPrompt, selectedWrapper, dispatch]);

  const switchToChat = useCallback(async (chat: ChatData) => {
    const outgoing = currentChatRef.current;
    const outgoingMessages = messagesRef.current;
    if (
      outgoing &&
      outgoing.id !== chat.id &&
      outgoingMessages.length > 0 &&
      !chatSyncService.isDeletedChatId(outgoing.id)
    ) {
      await chatSyncService.persistChat({
        ...outgoing,
        messages: outgoingMessages,
      }, true);
    }

    let nextChat = chat;
    if (!chat.messages?.length) {
      nextChat = (await chatSyncService.getChatFromServer(chat.id)) ?? chat;
    }
    nextChat = {
      ...nextChat,
      sessionId: nextChat.id,
    };

    currentChatRef.current = nextChat;
    lastSavedMessagesRef.current = JSON.stringify(nextChat.messages ?? []);
    stickToBottomRef.current = true;
    setCurrentChat(nextChat);
    setSessionId(nextChat.id);

    dispatch(clearHistory(currentModelId));
    
    for (const msg of nextChat.messages) {
      dispatch(addMessage({ modelId: currentModelId, message: msg }));
    }
    
    chatSyncService.setLastActiveChat(nextChat.id);
    closeChatListIfMobile();
  }, [currentModelId, dispatch]);

  const deleteChat = useCallback(async (chatId: string) => {
    const chatToDelete = availableChats.find(c => c.id === chatId);
    if (!chatToDelete) return;

    const wasCurrent = currentChatRef.current?.id === chatId;
    if (wasCurrent) {
      currentChatRef.current = null;
    }

    try {
      await chatSyncService.deleteChat(chatId);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Не удалось удалить чат');
      return;
    }

    const updatedChats = availableChats.filter(c => c.id !== chatId);
    setAvailableChats(updatedChats);

    if (wasCurrent) {
      const nextChat = updatedChats[0];
      if (nextChat) {
        await switchToChat(nextChat);
      } else {
        await createNewChat();
      }
    }
  }, [availableChats, createNewChat, switchToChat]);

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    const liveMessages =
      currentChatRef.current?.id === chatId ? messagesRef.current : undefined;
    const updated = await chatSyncService.renameChatOnServer(chatId, newTitle, liveMessages);
    if (!updated) return;

    setAvailableChats((prev) =>
      prev.map((c) => (c.id === chatId ? updated : c))
    );
    if (currentChatRef.current?.id === chatId) {
      setCurrentChat(updated);
      currentChatRef.current = updated;
    }
  }, []);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    const phone = window.matchMedia(WORKSPACE_PHONE_MQ);
    if (phone.matches) setToggle('showChatList', false);
    const onPhone = (event: MediaQueryListEvent) => {
      if (event.matches) setToggle('showChatList', false);
    };
    phone.addEventListener('change', onPhone);
    return () => phone.removeEventListener('change', onPhone);
  }, [setToggle]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isChatLoadedRef.current) {
      void loadChats();
    }
  }, [loadChats]);

  useEffect(() => {
    const onHide = () => {
      void chatSyncService.flushPendingChatSync();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const chat = currentChatRef.current;
    if (!currentModelId || !chat?.messages?.length || messages.length > 0) return;
    for (const msg of chat.messages) {
      if (msg?.content && msg.role) {
        dispatch(addMessage({ modelId: currentModelId, message: msg }));
      }
    }
  }, [currentModelId, dispatch, messages.length]);

  useEffect(() => {
    if (isStreaming) return;
    if (!currentChatRef.current || messages.length === 0 || !isChatLoadedRef.current) {
      return;
    }
    const timeoutId = setTimeout(() => {
      void saveCurrentChat();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [messages, saveCurrentChat, isStreaming]);

  const initializeSession = useCallback(async (forceReinit = false) => {
    if (initInProgressRef.current) {
      console.log('⏳ Инициализация уже в процессе, пропускаем...');
      return;
    }
    
    const currentParams = {
      serverReady: isServerReady,
      modelId: currentModelId,
      sessionId: sessionId,
      wrapper: selectedWrapper
    };
    
    const needsReinit = forceReinit || (
      isServerReady && 
      currentModelId &&
      (isServerReady !== lastInitParamsRef.current.serverReady ||
       currentModelId !== lastInitParamsRef.current.modelId)
    );
    
    if (!needsReinit && isInitialized) {
      console.log('✅ Сессия уже инициализирована, пропускаем');
      return;
    }
    
    initInProgressRef.current = true;
    
    try {
      if (!productMode && !wrappersLoadedRef.current) {
        console.log('📦 Загрузка chat wrappers...');
        const wrappersResponse = await agentService.getChatWrappers();
        if (isMountedRef.current && wrappersResponse.success && wrappersResponse.wrappers) {
          setAvailableWrappers(wrappersResponse.wrappers);
          const defaultWrapper = wrappersResponse.wrappers.find(w => w.name === 'default');
          if (defaultWrapper && selectedWrapper === 'default') {
            setSelectedWrapper('default');
          }
          wrappersLoadedRef.current = true;
        }
      }
      
      if (!toolsLoadedRef.current) {
        console.log('🔧 Загрузка инструментов...');
        const toolsResponse = await agentService.getAvailableTools();
        if (isMountedRef.current && toolsResponse.success && toolsResponse.tools) {
          const nextTools = filterToolsForRole(
            toolsResponse.tools,
            productMode ? 'employee' : undefined
          );
          setAvailableTools(nextTools);
          toolsLoadedRef.current = true;
        }
      }
      
      if (currentModel) {
        const initialPrompt = getSystemPromptForModel(currentModel);
        if (initialPrompt !== systemPrompt) {
          setSystemPrompt(initialPrompt);
          
          const matchingPreset = SYSTEM_PROMPT_PRESETS.find(p => 
            p.value === initialPrompt
          );
          if (matchingPreset) {
            setSelectedPromptPreset(matchingPreset.name);
          }
        }
      }
      
      if (isServerReady && currentModelId) {
        sessionCreatedRef.current = true;
      }
      
      setIsInitialized(true);
      lastInitParamsRef.current = currentParams;
      
    } catch (error) {
      console.error('Error initializing AgentLab:', error);
    } finally {
      initInProgressRef.current = false;
    }
  }, [isServerReady, currentModelId, sessionId, selectedWrapper, currentModel?.id, isInitialized, systemPrompt, productMode]);

  useEffect(() => {
    if (currentModel) {
      const modelOptions = getGenerationOptionsForModel(currentModel);
      setAdvancedOptions(prev => ({
        ...prev,
        temperature: modelOptions.temperature ?? prev.temperature,
        maxTokens: modelOptions.maxTokens ?? prev.maxTokens,
        repeatPenalty: modelOptions.repeatPenalty ?? prev.repeatPenalty,
        topP: modelOptions.topP ?? prev.topP,
        topK: modelOptions.topK ?? prev.topK
      }));
      
    }
  }, [currentModel, isQwen36Model]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized && !initInProgressRef.current) {
      void initializeSession();
    }
  }, [initializeSession, isInitialized]);
  
  useEffect(() => {
    if (isInitialized && currentModelId && currentModelId !== lastInitParamsRef.current.modelId) {
      console.log(`🔄 Модель изменилась: ${lastInitParamsRef.current.modelId} -> ${currentModelId}, переинициализация...`);
      sessionCreatedRef.current = false;
      initializeSession(true);
    }
  }, [currentModelId, isInitialized, initializeSession]);
  
  useEffect(() => {
    if (isServerReady && currentModelId && !sessionCreatedRef.current && !initInProgressRef.current) {
      console.log('🔄 Сервер готов, создаем сессию...');
      initializeSession();
    }
  }, [isServerReady, currentModelId, initializeSession]);
  
  useLayoutEffect(() => {
    if (activeTool !== 'chat') return;
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (stickToBottomRef.current || distanceFromBottom < 240) {
      element.scrollTop = element.scrollHeight;
    }
  }, [activeTool, messages, loading, isStreaming, scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 240;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [scrollRef, activeTool]);

  useEffect(() => {
    if (activeTool === 'chat' && messages.length > 0 && window.innerWidth < 768) {
      inputRef.current?.focus();
    }
  }, [activeTool, messages.length]);
  
  useEffect(() => {
    if (currentModel) {
      const modelPrompt = getSystemPromptForModel(currentModel);
      if (modelPrompt !== systemPrompt) {
        setSystemPrompt(modelPrompt);
        
        const matchingPreset = SYSTEM_PROMPT_PRESETS.find(p => 
          p.value === modelPrompt
        );
        if (matchingPreset) {
          setSelectedPromptPreset(matchingPreset.name);
        }
      }
    }
  }, [currentModel, systemPrompt]);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && showMobileMenu) {
        setShowMobileMenu(false);
      }
      if (window.innerWidth >= 1024 && showSettings) {
        setShowSettings(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMobileMenu, showSettings]);
  
  // Stop streaming function
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    dispatch(setLoading(false));
    
    // Update last message to remove streaming indicator
    const history = messages;
    if (history.length > 0) {
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
        dispatch(finalizeLastMessage({ 
          modelId: currentModelId, 
          content: lastMsg.content || 'Генерация прервана пользователем.'
        }));
      }
    }
  }, [dispatch, currentModelId, messages]);
  
  // ========== ОБРАБОТЧИКИ УПРАВЛЕНИЯ МОДЕЛЬЮ ==========
  
  const handleStartModel = async (
    modelId: string,
    launchOptions?: LoadLaunchOptions
  ): Promise<boolean> => {
    setIsModelActionLoading(true);
    dispatch(setModelOperation('load'));
    setLastOperationResult(null);
    sessionCreatedRef.current = false;
    
    try {
      let result = await agentService.startModel(modelId, undefined, undefined, undefined, launchOptions);
      if (!result.success && result.httpStatus === 409) {
        const confirmed = await confirmDialog({
          title: 'Завершить сессии?',
          description: `${result.message}. Активные inference-сессии будут сброшены, история чатов в БД сохранится.`,
          confirmLabel: 'Завершить и запустить',
        });
        if (!confirmed) return false;
        result = await agentService.startModel(modelId, undefined, undefined, undefined, { ...launchOptions, force: true });
      }
      setLastOperationResult(result);
      
      if (result.success) {
        const model = getModelById(modelId);
        
        dispatch(setSelectedModelId(modelId));
        dispatch(setActiveModel(modelId));
        
        const status = await agentService.getServerStatus();
        dispatch(setServerStatus(status));
        
        const modelPrompt = model ? getSystemPromptForModel(model) : DEFAULT_SYSTEM_PROMPT;
        setSystemPrompt(modelPrompt);
        sessionCreatedRef.current = true;
        
        const modelTypeInfo = model?.modelFamily === 'saiga' ? '🇷🇺 Saiga (русскоязычная)' :
                              model?.modelFamily === 'qwen' ? '🐫 Qwen (мультиязычная)' :
                              model?.supportsTools ? '🔧 xLAM (поддержка инструментов)' :
                              '📝 Стандартная';
        
        dispatch(addMessage({ 
          modelId: modelId, 
          message: { 
            role: 'assistant', 
            content: `### 🚀 ${result.alreadyLoaded ? 'Модель уже загружена' : 'Модель запущена'}\n\n**Модель:** ${model?.name || modelId}\n**Тип:** ${modelTypeInfo}\n**Семейство:** ${model?.modelFamily || 'unknown'}\n**Инструменты:** ${model?.supportsTools ? '✅ Да' : '❌ Нет'}\n**Статус:** ✅ Готова к работе${launchOptions?.launchProfile ? `\n**Профиль запуска:** ${launchOptions.launchProfile}` : ''}${result.launchApplied?.length ? `\n**Флаги llama-server:** ${result.launchApplied.join(', ')}` : ''}${result.alreadyLoaded ? '\n\nllama-server не перезапускался: флаги запуска не заданы.' : ''}\n\nТеперь вы можете отправлять запросы этой модели.`
          } 
        }));
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      dispatch(addMessage({ 
        modelId: currentModelId, 
        message: { 
          role: 'assistant', 
          content: `### ❌ Ошибка запуска модели\n\n**Модель:** ${modelId}\n**Ошибка:** ${error instanceof Error ? error.message : 'Неизвестная ошибка'}\n\nПроверьте доступность файла модели и права доступа.`
        } 
      }));
      return false;
    } finally {
      setIsModelActionLoading(false);
      dispatch(setModelOperation(null));
    }
  };

  const requestStartModel = (modelId: string) => {
    if (userIsAdmin) setLaunchDialogModelId(modelId);
  };
  
  const handleStopModel = async () => {
    if (!currentModelId) return;
    
    setIsModelActionLoading(true);
    dispatch(setModelOperation('unload'));
    setLastOperationResult(null);
    
    try {
      const result = await agentService.stopModel();
      setLastOperationResult(result);
      
      if (result.success) {
        dispatch(setActiveModel(null));
        
        const status = await agentService.getServerStatus();
        dispatch(setServerStatus(status));
        
        dispatch(addMessage({ 
          modelId: currentModelId, 
          message: { 
            role: 'assistant', 
            content: `### 🛑 Модель остановлена\n\nАктивная модель была остановлена. Выберите другую модель для продолжения работы.`
          } 
        }));
      }
    } catch (error) {
      dispatch(addMessage({ 
        modelId: currentModelId, 
        message: { 
          role: 'assistant', 
          content: `### ❌ Ошибка остановки модели\n\n**Ошибка:** ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        } 
      }));
    } finally {
      setIsModelActionLoading(false);
      dispatch(setModelOperation(null));
    }
  };
  
  const handleClearHistory = async () => {
    if (!currentModelId) return;
    
    try {
      const result = await agentService.clearChatHistory(sessionId);
      if (result.success) {
        dispatch(clearHistory(currentModelId));
        dispatch(addMessage({ 
          modelId: currentModelId, 
          message: { 
            role: 'system', 
            content: `### 🧹 История очищена\n\nИстория диалога для сессии "${sessionId}" была очищена.` 
          } 
        }));
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const addPendingImages = useCallback((fileList: File[]) => {
    if (!visionEnabled || fileList.length === 0) return;
    const { files, errors } = collectVisionFiles(fileList, pendingImagesRef.current.length);
    errors.forEach((error) => showErrorToast(error));
    if (files.length === 0) return;
    setPendingImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }, [visionEnabled]);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const next = prev.filter((item) => item.id !== id);
      prev.filter((item) => item.id === id).forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return next;
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.files).filter((file) => file.type.startsWith('image/'));
    if (visionEnabled && imageFiles.length > 0) {
      addPendingImages(imageFiles);
      e.preventDefault();
      if (!e.clipboardData.getData('text')) return;
    }

    const pastedText = e.clipboardData.getData('text');
    const textarea = inputRef.current;
    if (textarea && pastedText) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = input.slice(0, start) + pastedText + input.slice(end);
      setInput(newValue);
      e.preventDefault();
    }
  };

  // ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЯ С STREAMING
  const handleSendMessage = async () => {
    const filesToSend = pendingImages.map((item) => item.file);
    const imageAttachments: ChatImageAttachment[] = pendingImages.map((item) => ({
      name: item.file.name,
      mimeType: item.file.type,
      previewUrl: item.previewUrl,
    }));
    if ((!input.trim() && filesToSend.length === 0) || loading || isStreaming) return;
    stickToBottomRef.current = true;
    
    if (!isServerReady) {
      dispatch(addMessage({ 
        modelId: currentModelId, 
        message: { 
          role: 'system', 
          content: `### ⚠️ Модель не готова\n\nСервер не готов к обработке запросов. Пожалуйста, дождитесь загрузки модели или запустите модель вручную.` 
        } 
      }));
      return;
    }
    
    const userMessageContent = persistableVisionContent(input.trim(), filesToSend.length);
    const promptText = input.trim();
    const userMessage: ChatMessage = {
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString(),
      ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
    };
    
    dispatch(addMessage({ modelId: currentModelId, message: userMessage }));
    setInput('');
    setPendingImages([]);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const isAborted = () => abortController.signal.aborted;
    
    // Добавляем пустое сообщение ассистента для streaming
    dispatch(addMessage({ 
      modelId: currentModelId, 
      message: { 
        role: 'assistant', 
        content: '',
        timestamp: new Date().toISOString(),
        model: currentModelId,
        isStreaming: true
      } 
    }));
    
    setIsStreaming(true);
    dispatch(setLoading(true));
    
    try {
      const modelOptions = getGenerationOptionsForModel(currentModel);
      
      const activeChatId = currentChat?.id ?? sessionId;
      const grammarFields = productMode
        ? {}
        : grammarSelectionToApiFields(grammarSelection);
      const selectedTools = availableTools.filter((tool) => {
        const name = tool.function?.name;
        if (!name) return false;
        return selectedToolNames.length === 0 || selectedToolNames.includes(name);
      });
      const options: GenerationOptions = {
        temperature: modelOptions.temperature ?? advancedOptions.temperature,
        maxTokens: modelOptions.maxTokens ?? advancedOptions.maxTokens,
        topP: modelOptions.topP ?? advancedOptions.topP,
        topK: modelOptions.topK ?? advancedOptions.topK,
        repeatPenalty: modelOptions.repeatPenalty ?? advancedOptions.repeatPenalty,
        sessionId: activeChatId,
        chatId: activeChatId,
        history: toChatMessages(
          messages.filter((m) =>
            (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
            !m.isError &&
            !m.isStreaming
          )
        ),
        systemPrompt: systemPrompt,
        grammar: grammarFields.grammar,
        jsonSchema: grammarFields.json_schema,
        signal: abortController.signal,
        useTools,
        tools: useTools ? selectedTools : undefined,
        tool_choice: useTools ? (requireTools ? 'required' : 'auto') : 'none',
        enableThinking: qwenMode === 'instruct' ? false : enableThinking,
        preserveThinking: preserveThinking,
        mode: qwenMode,
      };

      if (filesToSend.length > 0) {
        await agentService.chatStreamVision(
          promptText,
          filesToSend,
          options,
          (_chunk, fullResponse) => {
            if (isAborted()) return;
            dispatch(updateLastMessage({
              modelId: currentModelId,
              content: fullResponse,
              isStreaming: true,
            }));
          },
          (fullResponse) => {
            if (isAborted()) return;
            const processedContent = postProcessResponse(
              fullResponse, 
              currentModel?.modelFamily,
              promptText,
              enableThinking
            );
            dispatch(finalizeLastMessage({ 
              modelId: currentModelId, 
              content: processedContent
            }));
            setIsStreaming(false);
            dispatch(setLoading(false));
          },
          (error) => {
            if (isAborted()) return;
            console.error('Vision stream error:', error);
            dispatch(updateLastMessage({ 
              modelId: currentModelId, 
              content: `❌ Ошибка: ${error.message}`,
              isError: true
            }));
            dispatch(finalizeLastMessage({ 
              modelId: currentModelId, 
              content: `❌ Ошибка: ${error.message}`
            }));
            setIsStreaming(false);
            dispatch(setLoading(false));
          }
        );
      } else {
        await agentService.chatStream(
          userMessageContent,
          options,
          (_chunk, fullResponse) => {
            if (isAborted()) return;
            dispatch(updateLastMessage({
              modelId: currentModelId,
              content: fullResponse,
              isStreaming: true,
            }));
          },
          (fullResponse) => {
            if (isAborted()) return;
            const processedContent = postProcessResponse(
              fullResponse, 
              currentModel?.modelFamily,
              userMessageContent,
              enableThinking
            );
            dispatch(finalizeLastMessage({ 
              modelId: currentModelId, 
              content: processedContent
            }));
            setIsStreaming(false);
            dispatch(setLoading(false));
          },
          (error) => {
            if (isAborted()) return;
            console.error('Chat stream error:', error);
            dispatch(updateLastMessage({ 
              modelId: currentModelId, 
              content: `❌ Ошибка: ${error.message}`,
              isError: true
            }));
            dispatch(finalizeLastMessage({ 
              modelId: currentModelId, 
              content: `❌ Ошибка: ${error.message}`
            }));
            setIsStreaming(false);
            dispatch(setLoading(false));
          }
        );
      }
      
    } catch (e: unknown) {
      if (!(e instanceof Error && e.name === 'AbortError') && !isAborted()) {
        console.error('Chat error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        dispatch(updateLastMessage({ 
          modelId: currentModelId, 
          content: `❌ Ошибка: ${errorMessage}`,
          isError: true
        }));
        dispatch(finalizeLastMessage({ 
          modelId: currentModelId, 
          content: `❌ Ошибка: ${errorMessage}`
        }));
        setIsStreaming(false);
        dispatch(setLoading(false));
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const SidebarButton = ({ tool, icon, label }: { tool: ActiveTool; icon: React.ReactNode; label: string }) => {
      const isActive = activeToolId === tool;
      
      return (
        <button 
          type="button"
          aria-pressed={isActive}
          onClick={() => setActiveTool(tool)} 
          className={`
 group relative
            w-full
            flex items-center justify-center
            rounded-xl
            transition-all duration-200
            ${isActive 
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' 
              : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground dark:hover:text-foreground'
            }
`}
          style={{ aspectRatio: '1 / 1' }}
          title={label}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {React.isValidElement(icon) 
              ? React.cloneElement(icon as React.ReactElement<{ className?: string; stroke?: string; fill?: string }>, { 
                  className: "w-5 h-5",
                  stroke: "currentColor",
                  fill: "none"
                })
              : icon
            }
          </div>
          
          <span className="
            absolute left-full ml-2
            px-2 py-1
            bg-foreground text-background text-xs
            rounded-lg
            whitespace-nowrap
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
            shadow-lg
            z-50
          ">
            {label}
          </span>
        </button>
      );
    };

    return (
      <div className="@container/agentchat flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
            <header className={cn(celestia.appHeader, 'flex items-center')}>
                <div className="flex h-full w-full items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                    {activeTool === 'chat' && (
                      <IconButton
                        label={showChatList ? 'Скрыть список чатов' : 'Показать список чатов'}
                        onClick={() => setShowChatList(!showChatList)}
                        className={cn(
                          celestia.headerIcon,
                          'shrink-0',
                          showChatList && 'bg-accent text-foreground'
                        )}
                        aria-pressed={showChatList}
                      >
                        <PanelLeftIcon />
                      </IconButton>
                    )}
                    <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {productMode || activeTool === 'chat' ? 'Помощник AI' : null}
                    {!productMode && activeTool === 'wrappers' && 'Chat Wrappers'}
                    {!productMode && activeTool === 'grammar' && 'Грамматика'}
                    {!productMode && activeTool === 'embedding' && 'Embeddings'}
                    {!productMode && activeTool === 'ranking' && 'Ранжирование'}
                    {!productMode && activeTool === 'functions' && 'Функции'}
                    {!productMode && activeTool === 'insights' && 'Инсайты'}
                    {!productMode && activeTool === 'settings' && 'Настройки'}
                    {!productMode && activeTool === 'system' && 'Система'}
                    </h2>
                    <span className="hidden @[28rem]/agentchat:block h-4 w-px bg-border shrink-0" />
                    <span
                      className="hidden @[22rem]/agentchat:block min-w-0 flex-1 truncate font-mono text-xs sm:text-sm text-muted-foreground"
                      title={currentModel ? formatLoadedModelLabel(currentModel) || currentModel.name : 'Модель не выбрана'}
                    >
                        {currentModel ? formatLoadedModelLabel(currentModel) || currentModel.name : 'Модель не выбрана'}
                    </span>
                </div>
                
                <div className="flex h-full shrink-0 items-center gap-0.5 sm:gap-1">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        connectionStatus === 'online' && 'bg-green-500',
                        connectionStatus === 'checking' && 'bg-green-500/50 animate-pulse',
                        (connectionStatus === 'error' || connectionStatus === 'offline') && 'bg-destructive'
                      )}
                    />
                    <span className="hidden @[32rem]/agentchat:inline">
                    {connectionStatus === 'online' && 'Готов'}
                    {connectionStatus === 'checking' && 'Проверка…'}
                    {connectionStatus === 'error' && 'Ошибка'}
                    {connectionStatus === 'offline' && 'Офлайн'}
                    </span>
                  </span>

                  {isStreaming && (
                    <button
                      type="button"
                      onClick={stopStreaming}
                      title="Остановить генерацию"
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 active:scale-95"
                    >
                      <StopStreamingIcon />
                      <span className="hidden @[36rem]/agentchat:inline">Стоп</span>
                    </button>
                  )}
                  
                  <div className="flex">
                    <AssistantToolsMenu
                      enabled={useTools}
                      onEnabledChange={setUseTools}
                      tools={availableTools}
                      selectedNames={selectedToolNames}
                      onSelectedNamesChange={setSelectedToolNames}
                      requireTools={requireTools}
                      onRequireToolsChange={setRequireTools}
                      disabled={isStreaming}
                    />
                  </div>

                  {isQwen36Model && !isStreaming && (
                    <div className="hidden @[28rem]/agentchat:flex items-center gap-1.5 min-w-0">
                      <div className="flex items-center bg-accent rounded-xl p-0.5">
                        <button
                          type="button"
                          aria-pressed={qwenMode === 'auto'}
                          onClick={() => { setQwenMode('auto'); }}
                          className={cn(
                            'px-2 h-7 rounded-lg text-xs transition-all duration-200 active:scale-95',
                            qwenMode === 'auto'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-border/80'
                          )}
                          title="Как в settings.chat: ваши temperature и thinking"
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          aria-pressed={qwenMode === 'thinking'}
                          onClick={() => { setQwenMode('thinking'); setEnableThinking(true); }}
                          className={cn(
                            'px-2 h-7 rounded-lg text-xs transition-all duration-200 active:scale-95',
                            qwenMode === 'thinking'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-border/80'
                          )}
                          title="Режим рассуждений"
                        >
                          Thinking
                        </button>
                        <button
                          type="button"
                          aria-pressed={qwenMode === 'instruct'}
                          onClick={() => { setQwenMode('instruct'); setEnableThinking(false); }}
                          className={cn(
                            'px-2 h-7 rounded-lg text-xs transition-all duration-200 active:scale-95',
                            qwenMode === 'instruct'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-border/80'
                          )}
                          title="Быстрые ответы"
                        >
                          Instruct
                        </button>
                        <button
                          type="button"
                          aria-pressed={qwenMode === 'coding'}
                          onClick={() => { setQwenMode('coding'); setEnableThinking(true); }}
                          className={cn(
                            'px-2 h-7 rounded-lg text-xs transition-all duration-200 active:scale-95',
                            qwenMode === 'coding'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-border/80'
                          )}
                          title="Режим программирования"
                        >
                          Coding
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {currentModel && !isServerReady && !isStreaming && userIsAdmin && (
                    <button
                      type="button"
                      onClick={() => requestStartModel(currentModel.id)}
                      disabled={isModelActionLoading}
                      className="hidden @[36rem]/agentchat:inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 active:scale-95 disabled:opacity-40"
                    >
                      <PlayIcon />
                      <span className="hidden sm:inline">{isModelActionLoading ? 'Запуск…' : 'Запустить'}</span>
                    </button>
                  )}

                  {isServerReady && currentModel && !isStreaming && userIsAdmin && (
                    <span className="hidden @[42rem]/agentchat:inline-flex items-center gap-0.5">
                      <IconButton
                        label="Перезапустить модель с флагами"
                        onClick={() => requestStartModel(currentModel.id)}
                        disabled={isModelActionLoading}
                        className={celestia.headerIcon}
                      >
                        <SwitchIcon />
                      </IconButton>
                      <IconButton
                        label="Остановить модель"
                        onClick={handleStopModel}
                        disabled={isModelActionLoading}
                        className={celestia.headerIcon}
                      >
                        <StopIcon />
                      </IconButton>
                    </span>
                  )}

                  <IconButton
                    label="Очистить историю чата"
                    onClick={handleClearHistory}
                    disabled={messages.length === 0 || isStreaming}
                    className={cn('hidden @[36rem]/agentchat:inline-flex', celestia.headerIcon)}
                  >
                    <ClearIcon />
                  </IconButton>

                  <button
                    ref={headerMenuRef}
                    type="button"
                    title="Ещё"
                    aria-label="Ещё действия"
                    aria-expanded={headerMenuOpen}
                    onClick={() => setHeaderMenuOpen((open) => !open)}
                    className={cn(
                      'inline-flex items-center justify-center rounded-xl hover:bg-accent/70 text-foreground/80 @[42rem]/agentchat:hidden',
                      celestia.headerIcon,
                      headerMenuOpen && 'bg-accent text-foreground'
                    )}
                  >
                    <MoreIcon />
                  </button>
                  <MenuPopover
                    open={headerMenuOpen}
                    onClose={() => setHeaderMenuOpen(false)}
                    triggerRef={headerMenuRef}
                    matchTriggerWidth={false}
                    minWidth={220}
                  >
                    <button
                      type="button"
                      className={celestia.headerMenuItem}
                      onClick={() => { setUseTools(!useTools); setHeaderMenuOpen(false); }}
                    >
                      {useTools ? 'Выключить инструменты' : 'Включить инструменты'}
                    </button>
                    {useTools && (
                      <label className={cn(celestia.headerMenuItem, 'cursor-pointer')}>
                        <input
                          type="checkbox"
                          checked={requireTools}
                          onChange={(e) => setRequireTools(e.target.checked)}
                          className="rounded"
                        />
                        Требовать вызов инструмента
                      </label>
                    )}
                    {isQwen36Model && isServerReady && !isStreaming && (
                      <>
                        <button type="button" className={celestia.headerMenuItem} onClick={() => { setQwenMode('auto'); setHeaderMenuOpen(false); }}>Auto</button>
                        <button type="button" className={celestia.headerMenuItem} onClick={() => { setQwenMode('thinking'); setEnableThinking(true); setHeaderMenuOpen(false); }}>Thinking</button>
                        <button type="button" className={celestia.headerMenuItem} onClick={() => { setQwenMode('instruct'); setEnableThinking(false); setHeaderMenuOpen(false); }}>Instruct</button>
                        <button type="button" className={celestia.headerMenuItem} onClick={() => { setQwenMode('coding'); setEnableThinking(true); setHeaderMenuOpen(false); }}>Coding</button>
                        {qwenMode !== 'instruct' && (
                          <label className={cn(celestia.headerMenuItem, 'cursor-pointer')}>
                            <input
                              type="checkbox"
                              checked={preserveThinking}
                              onChange={(e) => setPreserveThinking(e.target.checked)}
                              className="rounded"
                            />
                            Сохранять рассуждения
                          </label>
                        )}
                      </>
                    )}
                    {currentModel && !isServerReady && !isStreaming && userIsAdmin && (
                      <button type="button" className={celestia.headerMenuItem} disabled={isModelActionLoading} onClick={() => { setHeaderMenuOpen(false); requestStartModel(currentModel.id); }}>
                        {isModelActionLoading ? 'Запуск…' : 'Запустить модель'}
                      </button>
                    )}
                    {isServerReady && currentModel && !isStreaming && userIsAdmin && (
                      <>
                        <button type="button" className={celestia.headerMenuItem} disabled={isModelActionLoading} onClick={() => { setHeaderMenuOpen(false); requestStartModel(currentModel.id); }}>Перезапустить…</button>
                        <button type="button" className={celestia.headerMenuItem} disabled={isModelActionLoading} onClick={() => { setHeaderMenuOpen(false); handleStopModel(); }}>Остановить</button>
                      </>
                    )}
                    <button
                      type="button"
                      className={cn(celestia.headerMenuItem, 'text-red-500')}
                      disabled={messages.length === 0 || isStreaming}
                      onClick={() => { setHeaderMenuOpen(false); handleClearHistory(); }}
                    >
                      Очистить историю
                    </button>
                  </MenuPopover>
                </div>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 overflow-hidden">
        {!productMode && (
        <div className="w-14 flex-shrink-0 border-r border-border bg-background/40 flex flex-col">
          <div className="flex flex-col items-center gap-1 py-2 px-1 flex-1">
            <div className="flex flex-col items-center gap-1 w-full">
              <SidebarButton tool="chat" icon={<ChatIcon />} label="Чат" />
            </div>
            
            <div className="w-6 h-px bg-border dark:bg-muted my-2" />
            
            <div className="flex flex-col items-center gap-1 w-full">
              <SidebarButton tool="wrappers" icon={<WrappersIcon />} label="Chat Wrappers" />
              <SidebarButton tool="grammar" icon={<GrammarIcon />} label="Грамматика" />
              <SidebarButton tool="embedding" icon={<EmbeddingIcon />} label="Embeddings" />
              <SidebarButton tool="ranking" icon={<RankingIcon />} label="Rerank" />
              <SidebarButton tool="functions" icon={<FunctionsIcon />} label="Функции" />
              <SidebarButton tool="insights" icon={<InsightsIcon />} label="Инсайты" />
            </div>
            
            <div className="w-6 h-px bg-border dark:bg-muted my-2" />
            
            <div className="flex flex-col items-center gap-1 w-full mt-auto">
              <SidebarButton tool="settings" icon={<SettingsIcon />} label="Настройки" />
              <SidebarButton tool="system" icon={<SystemIcon />} label="Система" />
            </div>
          </div>
        </div>
        )}

        {activeTool === 'chat' && (
            <ChatList
              chats={availableChats}
              currentChatId={currentChat?.id}
              isLoading={chatsRefreshing || isStreaming}
              isLoaded={chatsLoaded}
              onSelectChat={switchToChat}
              onDeleteChat={deleteChat}
              onRenameChat={renameChat}
              onCreateNew={createNewChat}
              onRefresh={() => void refreshChatList()}
              onClose={() => setShowChatList(false)}
              open={showChatList}
            />
        )}
            
            <div className="flex-1 min-w-0 overflow-hidden relative">
                {activeTool === 'chat' && (
                    <div className="flex flex-col h-full min-w-0">
                        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3" ref={scrollRef}>
                            <div className={cn(celestia.chatColumn, 'space-y-4 min-w-0')}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3">
                                        <ChatIcon />
                                    </div>
                                    <span className="text-base font-medium text-foreground">
                                      {currentChat ? currentChat.title : 'История сообщений пуста'}
                                    </span>
                                    <p className="text-sm mt-2 text-muted-foreground text-center max-w-md">
                                      {!isServerReady
                                        ? productMode
                                          ? 'Сервис готовится к работе. Если чат недоступен — обратитесь к администратору.'
                                          : 'Модель не загружена. Нажмите "Запустить" для активации модели.'
                                        : 'Начните диалог'}
                                    </p>
                                    {!isServerReady && currentModel && userIsAdmin && (
                                      <button
                                        onClick={() => requestStartModel(currentModel.id)}
                                        className="mt-4 px-4 py-2 btn-gradient text-white rounded-lg text-sm font-medium"
                                      >
                                        Запустить модель
                                      </button>
                                    )}
                                    {isServerReady && (
                                      <button
                                        onClick={createNewChat}
                                        className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                                      >
                                        Создать новый чат
                                      </button>
                                    )}
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn('flex w-full min-w-0 max-w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    <div className={cn(msg.role === 'user' ? celestia.chatBubbleUser : celestia.chatBubbleAi, 'min-w-0')}>
                                        <FormattedMessage 
                                          content={msg.content} 
                                          isDarkMode={isDarkMode}
                                          isUser={msg.role === 'user'}
                                          isStreaming={msg.isStreaming}
                                          images={msg.images}
                                        />
                                    </div>
                                </div>
                            ))}
                            {loading && !isStreaming && (
                                <div className="flex justify-start py-1">
                                        <div className="flex space-x-1.5">
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                </div>
                            )}
                            </div>
                        </div>
                        <div className={celestia.composerDock}>
                            <div className={celestia.chatColumn}>
                            {pendingImages.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {pendingImages.map((item) => (
                                  <div key={item.id} className="relative">
                                    <img
                                      src={item.previewUrl}
                                      alt={item.file.name}
                                      className="h-16 w-16 rounded-xl object-cover border border-border"
                                    />
                                    <button
                                      type="button"
                                      aria-label="Убрать изображение"
                                      onClick={() => removePendingImage(item.id)}
                                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background text-xs leading-none"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div
                              className={celestia.chatComposer}
                              onDragOver={(e) => {
                                if (!visionEnabled) return;
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                if (!visionEnabled) return;
                                e.preventDefault();
                                addPendingImages(Array.from(e.dataTransfer.files));
                              }}
                            >
                                {visionEnabled && (
                                  <>
                                    <input
                                      ref={imageInputRef}
                                      type="file"
                                      accept={VISION_ACCEPT}
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        addPendingImages(Array.from(e.target.files ?? []));
                                        e.currentTarget.value = '';
                                      }}
                                    />
                                    <button
                                      type="button"
                                      aria-label="Прикрепить изображение"
                                      title="Прикрепить изображение"
                                      disabled={loading || !isServerReady || isStreaming}
                                      onClick={() => imageInputRef.current?.click()}
                                      className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                                    >
                                      <AttachIcon />
                                    </button>
                                  </>
                                )}
                                <textarea
                                    id="agent-lab-prompt"
                                    name="prompt"
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={
                                      !isServerReady
                                        ? "Дождитесь загрузки модели..."
                                        : visionEnabled
                                          ? "Сообщение или изображение..."
                                          : "Введите сообщение... (Shift+Enter для переноса)"
                                    }
                                    className={celestia.chatComposerInput}
                                    rows={1}
                                    autoComplete="off"
                                    disabled={loading || !isServerReady || isStreaming}
                                />
                                <button
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={loading || (!input.trim() && pendingImages.length === 0) || !isServerReady || isStreaming}
                                    aria-label="Отправить"
                                    className={celestia.sendButton}
                                >
                                    <SendIcon />
                                </button>
                            </div>
                            <div className="text-[11px] text-center mt-1.5 text-muted-foreground">
                                {isStreaming
                                  ? 'Генерация ответа...'
                                  : !isServerReady
                                    ? 'Модель не загружена'
                                    : visionEnabled
                                      ? 'Enter — отправить · можно вставить или перетащить фото'
                                      : 'Enter — отправить, Shift+Enter — новая строка'}
                            </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTool === 'wrappers' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="wrappers" className="p-3 sm:p-4 h-full">
                        <ChatWrapperManager
                            isDarkMode={isDarkMode}
                            onWrapperSelect={(wrapper) => {
                                if (wrapper && wrapper !== selectedWrapper) {
                                    setSelectedWrapper(wrapper);
                                    sessionCreatedRef.current = false;
                                    initializeSession(true);
                                }
                            }}
                            currentModel={currentModel}
                        />
                    </PanelScrollArea>
                )}
                
                {activeTool === 'grammar' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="grammar" className="p-3 sm:p-4 h-full">
                        <GrammarBuilder 
                            isDarkMode={isDarkMode} 
                            onGrammarChange={setGrammarSelection}
                            currentSelection={grammarSelection}
                        />
                    </PanelScrollArea>
                )}

                {activeTool === 'embedding' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="embedding" className="p-3 sm:p-4 h-full">
                        <EmbeddingTools isDarkMode={isDarkMode} />
                    </PanelScrollArea>
                )}

                {activeTool === 'ranking' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="ranking" className="p-3 sm:p-4 h-full">
                        <RankingTool isDarkMode={isDarkMode} />
                    </PanelScrollArea>
                )}

                {activeTool === 'functions' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="functions" className="p-3 sm:p-4 h-full">
                        <FunctionDocumentationTool isDarkMode={isDarkMode} tools={availableTools} />
                    </PanelScrollArea>
                )}

                {activeTool === 'insights' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="insights" className="p-3 sm:p-4 h-full">
                         <ModelInsightsPanel 
                             modelId={currentModelId} 
                             isDarkMode={isDarkMode} 
                         />
                    </PanelScrollArea>
                )}

                {activeTool === 'settings' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="settings" className="p-6 h-full">
                         <AdvancedSettings isDarkMode={isDarkMode} onSettingsChange={setAdvancedOptions} />
                    </PanelScrollArea>
                )}

                {activeTool === 'system' && (
                    <PanelScrollArea panelId={PANEL_IDS.AGENT_LAB} tab="system" className="p-6 h-full">
                        <SystemInfoPanel isDarkMode={isDarkMode} embedded />
                    </PanelScrollArea>
                )}
            </div>
        </div>
        {launchDialogModelId && (
          <ModelLaunchDialog
            open
            modelId={launchDialogModelId}
            modelName={getModelById(launchDialogModelId)?.name}
            onClose={() => setLaunchDialogModelId(null)}
            onStart={async (options) => {
              const ok = await handleStartModel(launchDialogModelId, options);
              if (!ok) throw new Error('Запуск не удался, подробности в чате');
            }}
          />
        )}
    </div>
  );
};

export default AgentLab;