import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User, UserSettings } from '../types';
import * as authService from '../services/authService';
import { ApiError } from '../services/apiClient';

const initialState: AuthState = {
  user: null,
  settings: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  emailVerificationRequired: false,
  maintenance: null,
};

export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const me = await authService.getMe();
      return me;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      if (error instanceof ApiError && error.code === 'MAINTENANCE') {
        const details = error.data as { message?: unknown } | undefined;
        dispatch(authSlice.actions.setMaintenance({
          enabled: true,
          message: typeof details?.message === 'string' && details.message !== 'MAINTENANCE' ? details.message : undefined,
        }));
        return null;
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Auth bootstrap failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authService.login(email, password);
      const me = await authService.getMe();
      return { ...result, settings: me?.settings ?? null };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          return rejectWithValue({ code: 'EMAIL_NOT_VERIFIED', message: error.message });
        }
      }
      return rejectWithValue({ code: 'LOGIN_FAILED', message: error instanceof Error ? error.message : 'Login failed' });
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, displayName }: { email: string; password: string; displayName?: string },
    { rejectWithValue }
  ) => {
    try {
      return await authService.register(email, password, displayName);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  authService.logout();
});

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const result = await authService.verifyEmail(token);
      const me = await authService.getMe();
      return { ...result, settings: me?.settings ?? null };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Verification failed');
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (email: string, { rejectWithValue }) => {
    try {
      return await authService.resendVerification(email);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Resend failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (displayName: string, { rejectWithValue }) => {
    try {
      const user = await authService.updateProfile(displayName);
      return user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Profile update failed');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Password change failed');
    }
  }
);

export const fetchUserSettings = createAsyncThunk(
  'auth/fetchUserSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getUserSettings();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load settings');
    }
  }
);

export const saveUserSettings = createAsyncThunk(
  'auth/saveUserSettings',
  async (settings: UserSettings, { rejectWithValue }) => {
    try {
      return await authService.updateUserSettings(settings);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save settings');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setMaintenance: (state, action: PayloadAction<{ enabled: boolean; message?: string } | null>) => {
      state.maintenance = action.payload;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<{ user: User; settings?: UserSettings | null }>) => {
      state.user = action.payload.user;
      state.settings = action.payload.settings ?? state.settings;
      state.isAuthenticated = true;
      state.emailVerificationRequired = !action.payload.user.emailVerified;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.settings = action.payload.settings;
          state.isAuthenticated = true;
          state.emailVerificationRequired = !action.payload.user.emailVerified;
        } else {
          state.user = null;
          state.settings = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Auth error';
        state.isAuthenticated = false;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.settings = action.payload.settings;
        state.isAuthenticated = true;
        state.emailVerificationRequired = !action.payload.user.emailVerified;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as { code?: string; message?: string } | undefined;
        state.error = payload?.message ?? 'Login failed';
        state.emailVerificationRequired = payload?.code === 'EMAIL_NOT_VERIFIED';
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Registration failed';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.settings = null;
        state.isAuthenticated = false;
        state.emailVerificationRequired = false;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.settings = action.payload.settings;
        state.isAuthenticated = true;
        state.emailVerificationRequired = !action.payload.user.emailVerified;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(saveUserSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      });
  },
});

export const { setMaintenance, clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;
