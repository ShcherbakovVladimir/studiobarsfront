import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RuntimeConfigState } from '../types';
import { fetchPublicConfig, setApiBases } from '../services/apiClient';
import { applyChatDefaults, applyRagDefaults } from '../config/runtimeConfig';
import { resolveChatApiBase, resolveRagApiBase } from '../constants/api';
import { setRuntimeToolFeatures } from '../utils/auth';

const initialState: RuntimeConfigState = {
  config: null,
  isLoaded: false,
  error: null,
};

export const loadRuntimeConfig = createAsyncThunk('runtimeConfig/load', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchPublicConfig();
    if (!response.success || !response.config) {
      return rejectWithValue('Invalid runtime config response');
    }
    const { config } = response;
    const chatApiUrl = resolveChatApiBase(config.urls.chatApiUrl);
    const ragApiUrl = resolveRagApiBase(config.urls.ragApiUrl);
    setApiBases(chatApiUrl, ragApiUrl);
    applyChatDefaults(config.chatDefaults);
    applyRagDefaults(config.ragDefaults);
    setRuntimeToolFeatures(config.features);
    return config;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Config load failed');
  }
});

const runtimeConfigSlice = createSlice({
  name: 'runtimeConfig',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRuntimeConfig.pending, (state) => {
        state.error = null;
      })
      .addCase(loadRuntimeConfig.fulfilled, (state, action) => {
        state.config = action.payload;
        state.isLoaded = true;
      })
      .addCase(loadRuntimeConfig.rejected, (state, action) => {
        state.isLoaded = true;
        state.error = typeof action.payload === 'string' ? action.payload : 'Config error';
      });
  },
});

export default runtimeConfigSlice.reducer;
