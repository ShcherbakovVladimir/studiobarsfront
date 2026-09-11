// /home/user/projects/studioxlam/src/store/hardwareSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import monitoringService, { type MonitoringFullData } from '../services/monitoringService';
import { listGpus } from '../utils/gpuUtils';

type HardwareData = MonitoringFullData;

export interface GpuHistoryEntry {
  timestamp: string;
  temperature: number;
  utilization: number;
  memory: number;
}

export interface HardwareState {
  data: HardwareData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  autoRefresh: boolean;
  refreshInterval: number;
  history: {
    cpu: Array<{ timestamp: string; value: number }>;
    memory: Array<{ timestamp: string; value: number }>;
    gpu: Record<string, GpuHistoryEntry[]>;
  };
  warnings: Array<{
    id: string;
    type: 'high_temperature' | 'high_memory' | 'low_disk_space' | 'network_issue';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

const initialState: HardwareState = {
  data: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  autoRefresh: true,
  refreshInterval: 10000,
  history: {
    cpu: [],
    memory: [],
    gpu: {},
  },
  warnings: [],
};

export const fetchHardwareData = createAsyncThunk(
  'hardware/fetchData',
  async () => monitoringService.getFull()
);

const hardwareSlice = createSlice({
  name: 'hardware',
  initialState,
  reducers: {
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    clearHistory: (state) => {
      state.history = {
        cpu: [],
        memory: [],
        gpu: {},
      };
    },
    addWarning: (state, action: PayloadAction<Omit<HardwareState['warnings'][0], 'id' | 'timestamp'>>) => {
      const warning = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      state.warnings.unshift(warning);
    },
    resolveWarning: (state, action: PayloadAction<string>) => {
      const warning = state.warnings.find(w => w.id === action.payload);
      if (warning) {
        warning.resolved = true;
      }
    },
    clearWarnings: (state) => {
      state.warnings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHardwareData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHardwareData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
        state.lastUpdated = new Date().toISOString();

        const timestamp = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });

        if (action.payload.system) {
          state.history.cpu.push({
            timestamp,
            value: action.payload.system.cpuUsage || 0,
          });
          state.history.cpu = state.history.cpu.slice(-50);

          state.history.memory.push({
            timestamp,
            value: action.payload.system.memoryUsage || 0,
          });
          state.history.memory = state.history.memory.slice(-50);
        }

        listGpus(action.payload.gpu).forEach(({ key, stat }) => {
          const current = state.history.gpu[key] ?? [];
          current.push({
            timestamp,
            temperature: stat.temperature || 0,
            utilization: stat.utilization || 0,
            memory: stat.used || 0,
          });
          state.history.gpu[key] = current.slice(-50);
        });

        checkForWarnings(state, action.payload);
      })
      .addCase(fetchHardwareData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Ошибка загрузки данных мониторинга';
      });
  },
});

function checkForWarnings(state: HardwareState, data: HardwareData) {
  listGpus(data.gpu).forEach(({ index, stat }) => {
    const temperature = stat.temperature ?? 0;
    if (temperature <= 75) return;

    const warningExists = state.warnings.some(
      w => w.type === 'high_temperature' && !w.resolved && w.message.includes(`GPU ${index}`)
    );

    if (!warningExists) {
      state.warnings.unshift({
        id: Date.now().toString(),
        type: 'high_temperature',
        severity: 'high',
        message: `Высокая температура GPU ${index}: ${temperature}°C`,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
  });

  if (data.system?.memoryUsage && data.system.memoryUsage > 85) {
    const warningExists = state.warnings.some(
      w => w.type === 'high_memory' && !w.resolved
    );
    
    if (!warningExists) {
      state.warnings.unshift({
        id: Date.now().toString(),
        type: 'high_memory',
        severity: 'medium',
        message: `Высокое использование памяти: ${data.system.memoryUsage}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
  }

  if (data.system?.diskUsage && data.system.diskUsage > 90) {
    const warningExists = state.warnings.some(
      w => w.type === 'low_disk_space' && !w.resolved
    );
    
    if (!warningExists) {
      state.warnings.unshift({
        id: Date.now().toString(),
        type: 'low_disk_space',
        severity: 'high',
        message: `Мало места на диске: осталось ${100 - data.system.diskUsage}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  state.warnings = state.warnings.filter(
    warning => new Date(warning.timestamp).getTime() > oneDayAgo
  );
}

export const {
  setAutoRefresh,
  setRefreshInterval,
  clearHistory,
  addWarning,
  resolveWarning,
  clearWarnings,
} = hardwareSlice.actions;

export default hardwareSlice.reducer;
