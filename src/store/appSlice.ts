import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ViewMode } from '../types';
import type { AppState, HardwareStats, ServiceHealth, ServerStatus } from '../types';
import {
  applyHighContrast,
  loadHighContrast,
  resolveInitialTheme,
  saveHighContrast,
  saveTheme,
} from '../lib/theme';
import {
  applyPalette,
  DEFAULT_PALETTE,
  isPaletteId,
  loadSavedPalette,
  savePalette,
  type PaletteId,
} from '../lib/palettes';
import {
  applyFontPairing,
  DEFAULT_FONT_PAIRING,
  ensureFontStylesheet,
  isFontPairingId,
  loadSavedFontPairing,
  saveFontPairing,
  type FontPairingId,
} from '../lib/fonts';

const initialState: AppState = {
  viewMode: ViewMode.CATALOG,
  isDarkMode: resolveInitialTheme(),
  paletteId: loadSavedPalette(),
  fontPairingId: loadSavedFontPairing(),
  highContrast: loadHighContrast(),
  hardwareStats: {
    cpu: 15,
    gpu: 42,
    memory: 0,
    temperature: 0,
    gpuMemory: 0,
    disk: 0,
    lastUpdated: '',
  },
  serverStatus: {
    status: 'checking',
    serverReady: false,
    activeModel: null,
    modelLoaded: false,
    timestamp: '',
    sessions: 0,
  },
  health: {
    api: 'checking',
    model: 'unknown',
    activeModel: null,
    llamaServerHealthy: false,
    modelOperation: null,
  },
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
    setPalette: (state, action: PayloadAction<PaletteId>) => {
      const id = isPaletteId(action.payload) ? action.payload : DEFAULT_PALETTE;
      state.paletteId = id;
      savePalette(id);
      applyPalette(id, state.isDarkMode);
    },
    setFontPairing: (state, action: PayloadAction<FontPairingId>) => {
      const id = isFontPairingId(action.payload) ? action.payload : DEFAULT_FONT_PAIRING;
      state.fontPairingId = id;
      saveFontPairing(id);
      ensureFontStylesheet(id);
      applyFontPairing(id);
    },
    setHighContrast: (state, action: PayloadAction<boolean>) => {
      state.highContrast = action.payload;
      saveHighContrast(action.payload);
      applyHighContrast(action.payload);
    },
    updateHardwareStats: (state, action: PayloadAction<HardwareStats>) => {
      state.hardwareStats = {
        ...state.hardwareStats,
        ...action.payload,
        lastUpdated: action.payload.lastUpdated || new Date().toLocaleTimeString(),
      };
    },
    setServerStatus: (state, action: PayloadAction<ServerStatus>) => {
      state.serverStatus = action.payload;
    },
    updateHealth: (state, action: PayloadAction<Partial<ServiceHealth>>) => {
      state.health = { ...state.health, ...action.payload };
    },
    setModelOperation: (state, action: PayloadAction<ServiceHealth['modelOperation']>) => {
      state.health.modelOperation = action.payload;
      if (action.payload === 'load' || action.payload === 'swap') state.health.model = 'loading';
    },
  },
});

export const {
  setViewMode,
  toggleTheme,
  setTheme,
  setPalette,
  setFontPairing,
  setHighContrast,
  updateHardwareStats,
  setServerStatus,
  updateHealth,
  setModelOperation,
} = appSlice.actions;
export default appSlice.reducer;
