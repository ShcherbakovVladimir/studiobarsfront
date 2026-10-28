import { api, setToken, clearToken, getToken, getMailLinkApiBase, ApiError } from './apiClient';
import type { LlmApiKey, User, UserSettings } from '../types';
import { parseUserRole, setActiveUserRole } from '../utils/auth';
import { clearLocalChatStore, setChatSyncUserId } from './chatSyncService';
import { abortActiveStreams } from '../utils/activeStreams';

function normalizeUser(user: User): User {
  return { ...user, role: parseUserRole(user.role) };
}

interface SessionResponse {
  success: boolean;
  accessToken: string;
  user: User;
}

interface LoginResponse {
  success: boolean;
  accessToken?: string;
  user?: User;
  mfaRequired?: boolean;
  mfaToken?: string;
}

interface MeResponse {
  success: boolean;
  user: User;
  settings: UserSettings;
}

interface RegisterResponse {
  success: boolean;
  user: User;
  message: string;
}

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const data = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.mfaRequired) {
    throw new ApiError('Введите код второго фактора', 401, 'MFA_REQUIRED', { mfaToken: data.mfaToken });
  }
  if (!data.accessToken || !data.user) {
    throw new ApiError('Сервер не выдал токен входа', 401, 'UNAUTHORIZED');
  }
  setToken(data.accessToken);
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, accessToken: data.accessToken };
}

export async function completeMfa(mfaToken: string, code: string): Promise<{ user: User; accessToken: string }> {
  const data = await api<SessionResponse>('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code }),
  });
  if (!data.accessToken || !data.user) {
    throw new ApiError('Сервер не выдал токен входа', 401, 'UNAUTHORIZED');
  }
  setToken(data.accessToken);
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, accessToken: data.accessToken };
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<RegisterResponse> {
  return api<RegisterResponse>(
    '/auth/register',
    {
      method: 'POST',
      referrerPolicy: 'origin',
      body: JSON.stringify({ email, password, displayName }),
    },
    getMailLinkApiBase()
  );
}

export async function getMe(): Promise<{ user: User; settings: UserSettings } | null> {
  if (!getToken()) return null;
  const data = await api<MeResponse>('/auth/me');
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, settings: data.settings };
}

export async function verifyEmail(token: string): Promise<{ user: User; accessToken: string }> {
  const data = await api<SessionResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  setToken(data.accessToken);
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, accessToken: data.accessToken };
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return api(
    '/auth/forgot-password',
    {
      method: 'POST',
      referrerPolicy: 'origin',
      body: JSON.stringify({ email }),
    },
    getMailLinkApiBase()
  );
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  return api('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
  return api(
    '/auth/resend-verification',
    {
      method: 'POST',
      referrerPolicy: 'origin',
      body: JSON.stringify({ email }),
    },
    getMailLinkApiBase()
  );
}

export async function updateProfile(displayName: string): Promise<User> {
  const data = await api<{ success: boolean; user: User }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
  return normalizeUser(data.user);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getUserSettings(): Promise<UserSettings> {
  const data = await api<{ success: boolean; settings: UserSettings }>('/user/settings');
  return data.settings;
}

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  const data = await api<{ success: boolean; settings: UserSettings }>('/user/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
  return data.settings;
}

export async function listApiKeys(): Promise<LlmApiKey[]> {
  const data = await api<{ success: boolean; apiKeys: LlmApiKey[] }>('/auth/api-keys');
  return (data.apiKeys ?? []).map(withoutApiKeySecret);
}

export async function createApiKey(input: {
  name?: string;
  expiresInDays?: number;
}): Promise<{ message: string; apiKey: LlmApiKey }> {
  const body: { name?: string; expiresInDays?: number } = {};
  if (input.name?.trim()) body.name = input.name.trim();
  if (input.expiresInDays != null) body.expiresInDays = input.expiresInDays;
  const data = await api<{ success: boolean; message?: string; apiKey: LlmApiKey }>('/auth/api-keys', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    message: data.message || 'Сохраните ключ: он показывается один раз',
    apiKey: data.apiKey,
  };
}

export async function revokeApiKey(id: string): Promise<void> {
  await api(`/auth/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function withoutApiKeySecret(row: LlmApiKey): LlmApiKey {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  };
}

export function logout(): void {
  abortActiveStreams();
  setActiveUserRole(null);
  clearLocalChatStore();
  setChatSyncUserId(null);
  clearToken();
}
