import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  InferenceLabAccess,
  InferenceLabAnalytics,
  InferenceLabPage,
  InferenceRequestRecord,
} from '../types';
import inferenceLabService, {
  type InferenceLabListParams,
} from '../services/inferenceLabService';

interface InferenceLabUiState {
  access: InferenceLabAccess | null;
  accessLoading: boolean;
  accessError: string | null;
  requests: InferenceLabPage<InferenceRequestRecord>;
  historyLoading: boolean;
  historyError: string | null;
  analytics: InferenceLabAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  selected: InferenceRequestRecord | null;
}

const emptyPage: InferenceLabPage<InferenceRequestRecord> = {
  items: [],
  page: 1,
  limit: 50,
  total: 0,
};

const initialState: InferenceLabUiState = {
  access: null,
  accessLoading: false,
  accessError: null,
  requests: emptyPage,
  historyLoading: false,
  historyError: null,
  analytics: null,
  analyticsLoading: false,
  analyticsError: null,
  selected: null,
};

export const fetchInferenceLabAccess = createAsyncThunk(
  'inferenceLab/access',
  async (_, { getState, rejectWithValue }) => {
    const role = (getState() as { auth?: { user?: { role?: string } } }).auth?.user?.role;
    if (role === 'employee') {
      return rejectWithValue('ROLE_FORBIDDEN');
    }
    try {
      return await inferenceLabService.getAccess();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Нет доступа');
    }
  }
);

export const fetchInferenceLabRequests = createAsyncThunk(
  'inferenceLab/requests',
  async (
    args: { params?: InferenceLabListParams; admin?: boolean } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await inferenceLabService.listRequests(args?.params, args?.admin);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось загрузить историю');
    }
  }
);

export const fetchInferenceLabAnalytics = createAsyncThunk(
  'inferenceLab/analytics',
  async (
    args: { days?: number; userId?: string; admin?: boolean } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await inferenceLabService.getAnalytics(
        { days: args?.days ?? 30, userId: args?.userId },
        args?.admin
      );
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось загрузить аналитику');
    }
  }
);

export const fetchInferenceLabRequest = createAsyncThunk(
  'inferenceLab/request',
  async (id: string, { rejectWithValue }) => {
    try {
      return await inferenceLabService.getRequest(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Прогон не найден');
    }
  }
);

export const deleteInferenceLabRequest = createAsyncThunk(
  'inferenceLab/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await inferenceLabService.deleteRequest(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось удалить');
    }
  }
);

const inferenceLabSlice = createSlice({
  name: 'inferenceLab',
  initialState,
  reducers: {
    clearInferenceLabSelection: (state) => {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInferenceLabAccess.pending, (state) => {
        state.accessLoading = true;
        state.accessError = null;
      })
      .addCase(fetchInferenceLabAccess.fulfilled, (state, action) => {
        state.accessLoading = false;
        state.access = action.payload;
      })
      .addCase(fetchInferenceLabAccess.rejected, (state, action) => {
        state.accessLoading = false;
        state.accessError = typeof action.payload === 'string' ? action.payload : 'Нет доступа';
        state.access = {
          allowed: false,
          reason: state.accessError,
          enabled: false,
          adminOnly: false,
          userBlocked: false,
        };
      })
      .addCase(fetchInferenceLabRequests.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchInferenceLabRequests.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.requests = action.payload;
      })
      .addCase(fetchInferenceLabRequests.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = typeof action.payload === 'string' ? action.payload : 'Ошибка истории';
      })
      .addCase(fetchInferenceLabAnalytics.pending, (state) => {
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchInferenceLabAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchInferenceLabAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.analyticsError = typeof action.payload === 'string' ? action.payload : 'Ошибка аналитики';
      })
      .addCase(fetchInferenceLabRequest.fulfilled, (state, action) => {
        state.selected = { ...action.payload.request, response: action.payload.response };
      })
      .addCase(deleteInferenceLabRequest.fulfilled, (state, action) => {
        state.requests.items = state.requests.items.filter((item) => item.id !== action.payload);
        state.requests.total = Math.max(0, state.requests.total - 1);
        if (state.selected?.id === action.payload) state.selected = null;
      });
  },
});

export const { clearInferenceLabSelection } = inferenceLabSlice.actions;
export default inferenceLabSlice.reducer;
