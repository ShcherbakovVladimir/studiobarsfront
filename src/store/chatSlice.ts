// /home/user/projects/studioxlam/src/store/chatSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, ChatMessage } from '../types';
import { getErrorMessage } from '../utils/errorUtils';
import { logout } from './authSlice';

// Ключ для localStorage
const STORAGE_KEY = 'studioxlamp_chat_histories';
const SETTINGS_KEY = 'studioxlamp_chat_settings';

// Функция загрузки истории из localStorage
const loadHistoriesFromStorage = (): Record<string, ChatMessage[]> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Восстанавливаем timestamp как строки (если были числами)
      for (const modelId in parsed) {
        if (Array.isArray(parsed[modelId])) {
          parsed[modelId] = parsed[modelId].map((msg: Partial<ChatMessage> & Record<string, unknown>) => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString(),
            isStreaming: msg.isStreaming || false,
            isError: msg.isError || false
          }));
        }
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error loading chat history from localStorage:', getErrorMessage(error));
  }
  return {};
};

// Функция загрузки настроек из localStorage
const loadSettingsFromStorage = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', getErrorMessage(error));
  }
  return null;
};

// Функция сохранения истории в localStorage
const saveHistoriesToStorage = (histories: Record<string, ChatMessage[]>) => {
  try {
    // Ограничиваем размер хранимых данных (последние 100 сообщений на модель)
    const toStore: Record<string, ChatMessage[]> = {};
    for (const [modelId, messages] of Object.entries(histories)) {
      // Фильтруем сообщения, убираем streaming-сообщения без контента
      const filteredMessages = messages.filter(msg => 
        !(msg.isStreaming && !msg.content) && // Убираем пустые streaming сообщения
        !msg.isError // Можно сохранять ошибки, но лучше не сохранять
      );
      toStore[modelId] = filteredMessages.slice(-100).map((msg) => {
        if (!msg.images?.length) return msg;
        const { images: _images, ...rest } = msg;
        return rest;
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Error saving chat history to localStorage:', getErrorMessage(error));
  }
};

// Загружаем настройки из localStorage
const savedSettings = loadSettingsFromStorage();

const initialState: ChatState = {
  histories: loadHistoriesFromStorage(),
  settings: {
    temperature: savedSettings?.temperature ?? 0.7,
    maxTokens: savedSettings?.maxTokens ?? 2048,
    topP: savedSettings?.topP ?? 0.9,
    repeatPenalty: savedSettings?.repeatPenalty ?? 1.1
  },
  isLoading: false
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ modelId: string, message: ChatMessage }>) => {
      const { modelId, message } = action.payload;
      if (!state.histories[modelId]) {
        state.histories[modelId] = [];
      }
      state.histories[modelId].push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        isStreaming: message.isStreaming || false,
        isError: message.isError || false
      });
      
      // Сохраняем в localStorage после каждого добавления
      saveHistoriesToStorage(state.histories);
    },
    
    clearHistory: (state, action: PayloadAction<string>) => {
      state.histories[action.payload] = [];
      saveHistoriesToStorage(state.histories);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    updateSettings: (state, action: PayloadAction<Partial<ChatState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
      // Сохраняем настройки в localStorage
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    },
    
    // Удалить историю для конкретной модели
    removeHistory: (state, action: PayloadAction<string>) => {
      delete state.histories[action.payload];
      saveHistoriesToStorage(state.histories);
    },
    
    // Очистить ВСЮ историю
    clearAllHistories: (state) => {
      state.histories = {};
      localStorage.removeItem(STORAGE_KEY);
    },
    
    // Загрузить ВСЮ историю из localStorage (принудительно)
    reloadFromStorage: (state) => {
      state.histories = loadHistoriesFromStorage();
      const settings = loadSettingsFromStorage();
      if (settings) {
        state.settings = { ...state.settings, ...settings };
      }
    },
    
    // Обновить последнее сообщение в истории (для streaming)
    updateLastMessage: (state, action: PayloadAction<{ 
      modelId: string; 
      content: string;
      isStreaming?: boolean;
      isError?: boolean;
    }>) => {
      const { modelId, content, isStreaming, isError } = action.payload;
      const history = state.histories[modelId];
      
      if (history && history.length > 0) {
        const lastMessage = history[history.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content;
          if (isStreaming !== undefined) lastMessage.isStreaming = isStreaming;
          if (isError !== undefined) lastMessage.isError = isError;
          
          // Не сохраняем в localStorage при каждом обновлении streaming
          // Только периодически или при завершении
          if (!isStreaming) {
            saveHistoriesToStorage(state.histories);
          }
        }
      }
    },
    
    // Финализировать последнее сообщение (завершить streaming)
    finalizeLastMessage: (state, action: PayloadAction<{
      modelId: string;
      content: string;
    }>) => {
      const { modelId, content } = action.payload;
      const history = state.histories[modelId];
      
      if (history && history.length > 0) {
        const lastMessage = history[history.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content;
          lastMessage.isStreaming = false;
          delete lastMessage.isStreaming; // Удаляем флаг streaming
          if (lastMessage.isError) delete lastMessage.isError;
          
          // Сохраняем финальную версию сообщения
          saveHistoriesToStorage(state.histories);
        }
      }
    },
    
    // Обновить конкретное сообщение по индексу
    updateMessageAtIndex: (state, action: PayloadAction<{
      modelId: string;
      index: number;
      message: Partial<ChatMessage>;
    }>) => {
      const { modelId, index, message } = action.payload;
      const history = state.histories[modelId];
      
      if (history && history[index]) {
        history[index] = { ...history[index], ...message };
        saveHistoriesToStorage(state.histories);
      }
    },
    
    // Удалить сообщение по индексу
    removeMessageAtIndex: (state, action: PayloadAction<{
      modelId: string;
      index: number;
    }>) => {
      const { modelId, index } = action.payload;
      const history = state.histories[modelId];
      
      if (history && history[index]) {
        history.splice(index, 1);
        saveHistoriesToStorage(state.histories);
      }
    },
    
    // Вставить сообщение в историю по индексу
    insertMessageAtIndex: (state, action: PayloadAction<{
      modelId: string;
      index: number;
      message: ChatMessage;
    }>) => {
      const { modelId, index, message } = action.payload;
      if (!state.histories[modelId]) {
        state.histories[modelId] = [];
      }
      
      state.histories[modelId].splice(index, 0, {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      });
      saveHistoriesToStorage(state.histories);
    },
    
    // Очистить историю для конкретной модели и создать новое системное сообщение
    resetHistoryWithSystemPrompt: (state, action: PayloadAction<{
      modelId: string;
      systemPrompt?: string;
    }>) => {
      const { modelId, systemPrompt } = action.payload;
      
      if (systemPrompt) {
        state.histories[modelId] = [{
          role: 'system',
          content: systemPrompt,
          timestamp: new Date().toISOString()
        }];
      } else {
        state.histories[modelId] = [];
      }
      
      saveHistoriesToStorage(state.histories);
    },
    
    // Синхронизировать историю с сервером (замена всей истории)
    syncHistory: (state, action: PayloadAction<{
      modelId: string;
      history: ChatMessage[];
    }>) => {
      const { modelId, history } = action.payload;
      state.histories[modelId] = history.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString()
      }));
      saveHistoriesToStorage(state.histories);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(logout.fulfilled, (state) => {
      state.histories = {};
      localStorage.removeItem(STORAGE_KEY);
    });
  },
});

export const { 
  addMessage, 
  clearHistory, 
  setLoading, 
  updateSettings,
  removeHistory,
  clearAllHistories,
  reloadFromStorage,
  updateLastMessage,
  finalizeLastMessage,
  updateMessageAtIndex,
  removeMessageAtIndex,
  insertMessageAtIndex,
  resetHistoryWithSystemPrompt,
  syncHistory
} = chatSlice.actions;

export default chatSlice.reducer;