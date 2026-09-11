// /home/user/projects/studioxlam/src/store/adaptersSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AdapterInfo, ModelsState } from '../types';
import { getErrorMessage } from '../utils/errorUtils';
import { adapterService, type AdapterInfo as ServiceAdapterInfo } from '../services/adapterService';

function toSliceAdapter(adapter: ServiceAdapterInfo): AdapterInfo {
  const size =
    typeof adapter.size === 'number' ? adapter.size : Number(adapter.size) || 0;
  return {
    id: adapter.id,
    name: adapter.name,
    path: adapter.path ?? '',
    type: adapter.type,
    size,
    description: adapter.description ?? '',
    baseModel: adapter.baseModel,
    compatibleModels: adapter.compatibleModels,
    metadata: adapter.metadata,
    created: adapter.loadedAt,
  };
}

export interface AdapterState {
  adapters: AdapterInfo[];
  activeAdapter: AdapterInfo | null;
  activeAdapterPath: string;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  lastOperationResult: {
    success: boolean;
    message: string;
  } | null;
  supportInfo: {
    supported: boolean;
    features: Record<string, unknown>;
  };
  // Новые поля для интеграции с InferenceLab
  selectedAdapter: string;
  selectedAdapterPath: string;
  availableAdapters: AdapterInfo[];
  // Статусные флаги
  refreshRequired: boolean;
  lastRefresh: number | null;
}

const initialState: AdapterState = {
  adapters: [],
  activeAdapter: null,
  activeAdapterPath: '',
  isLoading: false,
  isActionLoading: false,
  error: null,
  lastOperationResult: null,
  supportInfo: {
    supported: false,
    features: {}
  },
  // Новые поля
  selectedAdapter: '',
  selectedAdapterPath: '',
  availableAdapters: [],
  refreshRequired: false,
  lastRefresh: null
};

// Async thunks
export const fetchAdapters = createAsyncThunk(
  'adapters/fetchAdapters',
  async (_, { rejectWithValue }) => {
    try {
      const data = await adapterService.getAvailableAdapters();
      if (!data.success && data.error && !data.adapters?.length) {
        throw new Error(data.error);
      }

      const adapters = (data.adapters ?? []).map(toSliceAdapter);
      const activeAdapter = data.activeAdapter ? toSliceAdapter(data.activeAdapter) : null;
      return {
        adapters,
        activeAdapter,
        availableAdapters: adapters,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to fetch adapters');
    }
  }
);

export const loadAdapter = createAsyncThunk(
  'adapters/loadAdapter',
  async (params: {
    adapterId?: string;
    adapterPath?: string;
    modelId?: string;
    scale?: number;
    baseModel?: string;
  }, { rejectWithValue }) => {
    try {
      const data = await adapterService.loadAdapter({
        adapterId: params.adapterId,
        adapterPath: params.adapterPath,
        modelId: params.modelId,
        scale: params.scale,
        baseModel: params.baseModel,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to load adapter');
      }

      return {
        adapter: data.adapter ? toSliceAdapter(data.adapter) : null,
        adapterPath: params.adapterPath || data.adapter?.path || '',
        adapterId: params.adapterId || data.adapter?.id || '',
        message: data.message || 'Adapter loaded successfully',
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to load adapter');
    }
  }
);

export const unloadAdapter = createAsyncThunk(
  'adapters/unloadAdapter',
  async (_, { rejectWithValue }) => {
    try {
      const data = await adapterService.unloadAdapter();
      if (!data.success) {
        throw new Error(data.error || 'Failed to unload adapter');
      }
      return { message: data.message || 'Adapter unloaded successfully' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to unload adapter');
    }
  }
);

export const fetchActiveAdapter = createAsyncThunk(
  'adapters/fetchActiveAdapter',
  async (_, { rejectWithValue }) => {
    try {
      const data = await adapterService.getActiveAdapter();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch active adapter');
      }

      return {
        adapter: data.adapter ? toSliceAdapter(data.adapter) : null,
        active: Boolean(data.adapter),
        adapterPath: data.adapter?.path || '',
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to fetch active adapter');
    }
  }
);

export const checkAdapterSupport = createAsyncThunk(
  'adapters/checkSupport',
  async (_, { rejectWithValue }) => {
    try {
      const data = await adapterService.checkAdapterSupport();
      return {
        supported: data.supported || false,
        features: data.features || {},
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to check adapter support');
    }
  }
);

export const swapAdapter = createAsyncThunk(
  'adapters/swapAdapter',
  async (params: { adapterId?: string; adapterPath?: string; scale?: number }, { rejectWithValue }) => {
    try {
      const data = await adapterService.swapAdapter(params);
      if (!data.success) {
        throw new Error(data.error || 'Failed to swap adapter');
      }

      return {
        adapter: data.adapter ? toSliceAdapter(data.adapter) : null,
        adapterPath: params.adapterPath || data.adapter?.path || '',
        message: data.message || 'Adapter swapped successfully',
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to swap adapter');
    }
  }
);

// Обновление состояния адаптера при успешной загрузке модели
export const updateAdapterOnModelLoad = createAsyncThunk(
  'adapters/updateOnModelLoad',
  async (modelId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { adapters: AdapterState };
      
      // Если есть активный адаптер, обновляем его для новой модели
      if (state.adapters.activeAdapter) {
        const adapter = state.adapters.activeAdapter;
        const result = await dispatch(loadAdapter({
          adapterId: adapter.id,
          adapterPath: adapter.path,
          modelId: modelId
        })).unwrap();
        
        return result;
      }
      
      return { message: 'No active adapter to update' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to update adapter for new model');
    }
  }
);

// Дополнительные thunks для интеграции с InferenceLab
export const applyAdapter = createAsyncThunk(
  'adapters/applyAdapter',
  async (params: { adapterId: string; adapterPath: string }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { models: ModelsState };
      const currentModel = state.models.activeModel || state.models.selectedModelId;
      
      if (!currentModel) {
        throw new Error('No model selected');
      }
      
      // Используем существующий thunk для загрузки адаптера
      const result = await dispatch(loadAdapter({
        adapterId: params.adapterId,
        adapterPath: params.adapterPath,
        modelId: currentModel
      })).unwrap();
      
      // Извлекаем adapterId и adapterPath из result если они там есть
      const { adapterId: resultAdapterId, adapterPath: resultAdapterPath, ...restResult } = result;
      
      return {
        ...restResult,
        // Используем значения из params как приоритетные
        adapterId: params.adapterId || resultAdapterId || '',
        adapterPath: params.adapterPath || resultAdapterPath || ''
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to apply adapter');
    }
  }
);

export const removeAdapter = createAsyncThunk(
  'adapters/removeAdapter',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Используем существующий thunk для выгрузки адаптера
      const result = await dispatch(unloadAdapter()).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to remove adapter');
    }
  }
);

export const refreshAdapters = createAsyncThunk(
  'adapters/refreshAdapters',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Обновляем список адаптеров и активный адаптер
      await dispatch(fetchAdapters()).unwrap();
      await dispatch(fetchActiveAdapter()).unwrap();
      return { timestamp: Date.now() };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error) || 'Failed to refresh adapters');
    }
  }
);

// Хелперы для проверки совместимости
export const checkAdapterCompatibility = (adapter: AdapterInfo, modelId?: string): boolean => {
  if (!adapter.compatibleModels || adapter.compatibleModels.length === 0) {
    return true; // Если список совместимости пуст, считаем совместимым
  }
  
  if (!modelId) {
    return true; // Если модель не указана, пропускаем проверку
  }
  
  return adapter.compatibleModels.includes(modelId);
};

const adaptersSlice = createSlice({
  name: 'adapters',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.lastOperationResult = null;
    },
    setActiveAdapter: (state, action: PayloadAction<{ adapter: AdapterInfo | null; adapterPath?: string }>) => {
      state.activeAdapter = action.payload.adapter;
      if (action.payload.adapterPath) {
        state.activeAdapterPath = action.payload.adapterPath;
      }
      state.lastOperationResult = {
        success: true,
        message: action.payload.adapter ? 'Adapter set as active' : 'Adapter cleared'
      };
    },
    clearAdapters: (state) => {
      state.adapters = [];
      state.activeAdapter = null;
      state.activeAdapterPath = '';
      state.error = null;
      state.lastOperationResult = null;
      state.selectedAdapter = '';
      state.selectedAdapterPath = '';
      state.availableAdapters = [];
    },
    setAdapterOperationResult: (state, action: PayloadAction<{
      success: boolean;
      message: string;
    } | null>) => {
      state.lastOperationResult = action.payload;
    },
    clearAdapterOperationResult: (state) => {
      state.lastOperationResult = null;
    },
    resetAdapterActionState: (state) => {
      state.isActionLoading = false;
      state.error = null;
    },
    // Новые reducers для интеграции с InferenceLab
    setSelectedAdapter: (state, action: PayloadAction<{ id: string; path: string }>) => {
      state.selectedAdapter = action.payload.id;
      state.selectedAdapterPath = action.payload.path;
    },
    clearSelectedAdapter: (state) => {
      state.selectedAdapter = '';
      state.selectedAdapterPath = '';
    },
    setAvailableAdapters: (state, action: PayloadAction<AdapterInfo[]>) => {
      state.availableAdapters = action.payload;
    },
    markRefreshRequired: (state) => {
      state.refreshRequired = true;
    },
    markRefreshCompleted: (state) => {
      state.refreshRequired = false;
      state.lastRefresh = Date.now();
    },
    // Синхронизация selected и active адаптеров
    syncSelectedWithActive: (state) => {
      if (state.activeAdapter) {
        state.selectedAdapter = state.activeAdapter.id;
        state.selectedAdapterPath = state.activeAdapterPath;
      } else {
        state.selectedAdapter = '';
        state.selectedAdapterPath = '';
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchAdapters
      .addCase(fetchAdapters.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(fetchAdapters.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adapters = action.payload.adapters;
        state.availableAdapters = action.payload.availableAdapters;
        
        // Обновляем активный адаптер если он пришел
        if (action.payload.activeAdapter) {
          const active = action.payload.activeAdapter;
          const activeAdapter = action.payload.adapters.find(
            (a) => a.id === active.id || a.path === active.path
          );
          if (activeAdapter) {
            state.activeAdapter = activeAdapter;
            state.activeAdapterPath = activeAdapter.path || '';
            state.selectedAdapter = activeAdapter.id;
            state.selectedAdapterPath = activeAdapter.path || '';
          }
        }
        
        state.lastOperationResult = {
          success: true,
          message: `Loaded ${action.payload.adapters.length} adapters`
        };
        state.lastRefresh = Date.now();
      })
      .addCase(fetchAdapters.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // loadAdapter
      .addCase(loadAdapter.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(loadAdapter.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.activeAdapter = action.payload.adapter;
        state.activeAdapterPath = action.payload.adapterPath || '';
        state.selectedAdapter = action.payload.adapterId || '';
        state.selectedAdapterPath = action.payload.adapterPath || '';
        state.lastOperationResult = {
          success: true,
          message: action.payload.message || 'Adapter loaded successfully'
        };
      })
      .addCase(loadAdapter.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // unloadAdapter
      .addCase(unloadAdapter.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(unloadAdapter.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.activeAdapter = null;
        state.activeAdapterPath = '';
        state.selectedAdapter = '';
        state.selectedAdapterPath = '';
        state.lastOperationResult = {
          success: true,
          message: action.payload.message || 'Adapter unloaded successfully'
        };
      })
      .addCase(unloadAdapter.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // fetchActiveAdapter
      .addCase(fetchActiveAdapter.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(fetchActiveAdapter.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeAdapter = action.payload.active ? action.payload.adapter : null;
        state.activeAdapterPath = action.payload.active ? action.payload.adapterPath : '';
        state.selectedAdapter = action.payload.active ? (action.payload.adapter?.id || '') : '';
        state.selectedAdapterPath = action.payload.active ? action.payload.adapterPath : '';
      })
      .addCase(fetchActiveAdapter.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // checkAdapterSupport
      .addCase(checkAdapterSupport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAdapterSupport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supportInfo = action.payload;
        state.lastOperationResult = {
          success: true,
          message: `Adapter support: ${action.payload.supported ? 'available' : 'not available'}`
        };
      })
      .addCase(checkAdapterSupport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // swapAdapter
      .addCase(swapAdapter.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(swapAdapter.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.activeAdapter = action.payload.adapter;
        state.activeAdapterPath = action.payload.adapterPath;
        state.selectedAdapter = action.payload.adapter?.id || '';
        state.selectedAdapterPath = action.payload.adapterPath;
        state.lastOperationResult = {
          success: true,
          message: action.payload.message || 'Adapter swapped successfully'
        };
      })
      .addCase(swapAdapter.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // updateAdapterOnModelLoad
      .addCase(updateAdapterOnModelLoad.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(updateAdapterOnModelLoad.fulfilled, (state) => {
        state.isActionLoading = false;
        state.lastOperationResult = {
          success: true,
          message: 'Adapter updated for new model'
        };
      })
      .addCase(updateAdapterOnModelLoad.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string || 'Failed to update adapter for new model'
        };
      })
      
      // applyAdapter
      .addCase(applyAdapter.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(applyAdapter.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.selectedAdapter = action.payload.adapterId;
        state.selectedAdapterPath = action.payload.adapterPath;
        state.lastOperationResult = {
          success: true,
          message: action.payload.message || 'Adapter applied successfully'
        };
      })
      .addCase(applyAdapter.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // removeAdapter
      .addCase(removeAdapter.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(removeAdapter.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.selectedAdapter = '';
        state.selectedAdapterPath = '';
        state.lastOperationResult = {
          success: true,
          message: action.payload.message || 'Adapter removed successfully'
        };
      })
      .addCase(removeAdapter.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      })
      
      // refreshAdapters
      .addCase(refreshAdapters.pending, (state) => {
        state.isLoading = true;
        state.isActionLoading = true;
        state.error = null;
        state.lastOperationResult = null;
      })
      .addCase(refreshAdapters.fulfilled, (state) => {
        state.isLoading = false;
        state.isActionLoading = false;
        state.refreshRequired = false;
        state.lastRefresh = Date.now();
        state.lastOperationResult = {
          success: true,
          message: 'Adapters refreshed successfully'
        };
      })
      .addCase(refreshAdapters.rejected, (state, action) => {
        state.isLoading = false;
        state.isActionLoading = false;
        state.error = action.payload as string;
        state.lastOperationResult = {
          success: false,
          message: action.payload as string
        };
      });
  }
});

export const { 
  clearError, 
  setActiveAdapter, 
  clearAdapters,
  setAdapterOperationResult,
  clearAdapterOperationResult,
  resetAdapterActionState,
  // Новые actions
  setSelectedAdapter,
  clearSelectedAdapter,
  setAvailableAdapters,
  markRefreshRequired,
  markRefreshCompleted,
  syncSelectedWithActive
} = adaptersSlice.actions;

// Селекторы
export const selectAllAdapters = (state: { adapters: AdapterState }) => state.adapters.adapters;
export const selectAvailableAdapters = (state: { adapters: AdapterState }) => state.adapters.availableAdapters;
export const selectActiveAdapter = (state: { adapters: AdapterState }) => state.adapters.activeAdapter;
export const selectSelectedAdapter = (state: { adapters: AdapterState }) => ({
  id: state.adapters.selectedAdapter,
  path: state.adapters.selectedAdapterPath
});
export const selectAdapterById = (adapterId: string) => (state: { adapters: AdapterState }) =>
  state.adapters.adapters.find(adapter => adapter.id === adapterId);
export const selectAdapterByPath = (adapterPath: string) => (state: { adapters: AdapterState }) =>
  state.adapters.adapters.find(adapter => adapter.path === adapterPath);
export const selectIsAdapterLoading = (state: { adapters: AdapterState }) => state.adapters.isLoading;
export const selectIsActionLoading = (state: { adapters: AdapterState }) => state.adapters.isActionLoading;
export const selectAdapterError = (state: { adapters: AdapterState }) => state.adapters.error;
export const selectLastOperationResult = (state: { adapters: AdapterState }) => state.adapters.lastOperationResult;
export const selectAdapterSupportInfo = (state: { adapters: AdapterState }) => state.adapters.supportInfo;
export const selectRefreshRequired = (state: { adapters: AdapterState }) => state.adapters.refreshRequired;
export const selectLastRefresh = (state: { adapters: AdapterState }) => state.adapters.lastRefresh;

export default adaptersSlice.reducer;