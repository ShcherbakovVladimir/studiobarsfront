// /home/user/projects/studioxlam/src/store/benchmarkSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import monitoringService from '../services/monitoringService';
import { listGpus } from '../utils/gpuUtils';

interface BenchmarkData {
  device: string;
  tps: number;
  latency: number;
  memory: number;
  precision: string;
  timestamp: string;
}

interface BenchmarkStats {
  avgTps: number;
  maxTps: number;
  minLatency: number;
  avgLatency: number;
  totalSamples: number;
  lastUpdated: string;
  activeDevices: number;
}

interface BenchmarkState {
  data: BenchmarkData[];
  stats: BenchmarkStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;
}

const initialState: BenchmarkState = {
  data: [],
  stats: null,
  isLoading: false,
  error: null,
  lastFetch: null,
};

export const fetchBenchmarkData = createAsyncThunk(
  'benchmark/fetchData',
  async () => {
    const data = await monitoringService.getFull();
    
    // Преобразуем данные API в формат для бенчмаркинга
    const benchmarkData: BenchmarkData[] = listGpus(data.gpu).map(({ key, stat }) => ({
      device: stat.name || key.toUpperCase(),
      tps: stat.utilization || 0,
      latency: stat.temperature || 0,
      memory: stat.used || 0,
      precision: 'FP16',
      timestamp: new Date().toISOString(),
    }));
    
    return benchmarkData;
  }
);

const benchmarkSlice = createSlice({
  name: 'benchmark',
  initialState,
  reducers: {
    updateBenchmarkStats: (state, action: PayloadAction<BenchmarkStats>) => {
      state.stats = action.payload;
    },
    clearBenchmarkData: (state) => {
      state.data = [];
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBenchmarkData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBenchmarkData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = [...state.data, ...action.payload].slice(-50); // Храним последние 50 записей
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchBenchmarkData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Ошибка загрузки данных бенчмаркинга';
      });
  },
});

export const { updateBenchmarkStats, clearBenchmarkData } = benchmarkSlice.actions;
export default benchmarkSlice.reducer;