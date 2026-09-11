// /home/user/projects/studioxlam/src/store/modelsSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ModelsState, XLAMModel, ServerStatus } from '../types';

const initialState: ModelsState = {
  selectedModelId: '',
  favorites: [],
  activeModel: null,
  models: [],
  isLoading: false,
  error: null,
  lastUpdated: null
};

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    // Устанавливаем выбранную модель (выбрана в интерфейсе)
    setSelectedModelId: (state, action: PayloadAction<string>) => {
      state.selectedModelId = action.payload;
    },
    
    // Устанавливаем активную модель (загружена и работает)
    setActiveModel: (state, action: PayloadAction<string | null>) => {
      const activeModelId = action.payload;
      state.activeModel = activeModelId;
      
      // Обновляем статус active для всех моделей
      state.models.forEach(model => {
        model.active = model.id === activeModelId;
      });
    },
    
    // Добавляем/убираем модель из избранного
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const modelId = action.payload;
      if (state.favorites.includes(modelId)) {
        state.favorites = state.favorites.filter(id => id !== modelId);
      } else {
        state.favorites.push(modelId);
      }
    },
    
    // Обновляем статус конкретной модели
    updateModelStatus: (state, action: PayloadAction<{
      modelId: string;
      available?: boolean;
      active?: boolean;
      size?: string;
      source?: 'server' | 'local';
    }>) => {
      const { modelId, available, active, size, source } = action.payload;
      const modelIndex = state.models.findIndex(m => m.id === modelId);
      
      if (modelIndex !== -1) {
        const model = state.models[modelIndex];
        if (model) {
          if (available !== undefined) model.available = available;
          if (active !== undefined) {
            model.active = active;
            // Обновляем activeModel если модель стала активной
            if (active) {
              state.activeModel = modelId;
            } else if (state.activeModel === modelId) {
              state.activeModel = null;
            }
          }
          if (size !== undefined) model.size = size;
          if (source !== undefined) model.source = source;
        }
      }
    },
    
    // Устанавливаем модели с сервера
    setServerModels: (state, action: PayloadAction<XLAMModel[]>) => {
      const serverModels = action.payload;
      
      // Обновляем или добавляем серверные модели
      serverModels.forEach(serverModel => {
        const existingIndex = state.models.findIndex(m => m.id === serverModel.id);
        
        if (existingIndex !== -1) {
          const existing = state.models[existingIndex];
          if (existing) {
            // Обновляем существующую модель
            state.models[existingIndex] = {
              ...existing,
              ...serverModel,
              // Сохраняем избранный статус
              favorite: existing.favorite
            };
          }
        } else {
          // Добавляем новую модель
          state.models.push({
            ...serverModel,
            favorite: false
          });
        }
      });
      
      // Удаляем старые серверные модели, которых больше нет на сервере
      state.models = state.models.filter(model => 
        model.source !== 'server' || 
        serverModels.some(serverModel => serverModel.id === model.id)
      );
      
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    
    // Устанавливаем статус сервера
    setServerStatus: (state, action: PayloadAction<ServerStatus>) => {
      const status = action.payload;
      if (status?.activeModel) {
        state.activeModel = status.activeModel;
        
        // Обновляем статус активной модели
        state.models.forEach(model => {
          model.active = model.id === status.activeModel;
        });
        
        // Если нет выбранной модели, выбираем активную
        if (!state.selectedModelId) {
          state.selectedModelId = status.activeModel;
        }
      }
    },
    
    // Устанавливаем состояние загрузки
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Устанавливаем ошибку
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Сброс статусов моделей
    resetModelStatuses: (state) => {
      state.models.forEach(model => {
        model.active = false;
        model.available = model.source === 'local' ? false : model.available;
      });
      state.activeModel = null;
    },
    
    // Опционально: действие для сброса только activeModel
    clearActiveModel: (state) => {
      state.activeModel = null;
      state.models.forEach(model => {
        model.active = false;
      });
    }
  }
});

export const { 
  setSelectedModelId, 
  setActiveModel,
  toggleFavorite,
  updateModelStatus,
  setServerModels,
  setServerStatus,
  setLoading,
  setError,
  resetModelStatuses,
  clearActiveModel
} = modelsSlice.actions;

export default modelsSlice.reducer;