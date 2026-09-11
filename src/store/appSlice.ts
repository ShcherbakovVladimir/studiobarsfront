// /home/user/projects/studioxlam/src/store/appSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ViewMode, ServerStatus } from '../types';
import type { AppState, HardwareStats } from '../types';
import { resolveInitialTheme, saveTheme } from '../lib/theme';

const initialState: AppState = {
  viewMode: ViewMode.CATALOG,
  isDarkMode: resolveInitialTheme(),
  hardwareStats: {
    cpu: 15,
    gpu: 42,
    memory: 0,
    temperature: 0,
    gpuMemory: 0,
    disk: 0,
    lastUpdated: ''
  },
  serverStatus: {
    status: 'checking',
    serverReady: false,
    activeModel: null,
    modelLoaded: false,
    timestamp: '',
    sessions: 0
  }
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setViewMode: (state, action: PayloadAction<typeof ViewMode[keyof typeof ViewMode]>) => {
      state.viewMode = action.payload;
    },
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      saveTheme(state.isDarkMode);
    },
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      saveTheme(state.isDarkMode);
    },
    updateHardwareStats: (state, action: PayloadAction<HardwareStats>) => {
      state.hardwareStats = {
        ...state.hardwareStats,
        ...action.payload,
        lastUpdated: action.payload.lastUpdated || new Date().toLocaleTimeString()
      };
    },
    setServerStatus: (state, action: PayloadAction<ServerStatus>) => {
      state.serverStatus = action.payload;
    }
  }
});

export const { setViewMode, toggleTheme, setTheme, updateHardwareStats, setServerStatus } = appSlice.actions;
export default appSlice.reducer;