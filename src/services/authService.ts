import { api, setToken, clearToken, getToken } from './apiClient';
import type { User, UserSettings } from '../types';
import { parseUserRole, setActiveUserRole } from '../utils/auth';
import { clearLocalChatStore, setChatSyncUserId } from './chatSyncService';

function normalizeUser(user: User): User {
  return { ...user, role: parseUserRole(user.role) };
}

interface LoginResponse {
  success: boolean;
  accessToken: string;
  user: User;
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
  return api<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function getMe(): Promise<{ user: User; settings: UserSettings } | null> {
  if (!getToken()) return null;
  const data = await api<MeResponse>('/auth/me');
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, settings: data.settings };
}

export async function verifyEmail(token: string): Promise<{ user: User; accessToken: string }> {
  const data = await api<LoginResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  setToken(data.accessToken);
  const user = normalizeUser(data.user);
  setChatSyncUserId(user.id);
  return { user, accessToken: data.accessToken };
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return api('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  return api('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
  return api('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
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

export function logout(): void {
  setActiveUserRole(null);
  clearLocalChatStore();
  setChatSyncUserId(null);
  clearToken();
}
