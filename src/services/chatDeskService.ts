import { resolveChatApiBase } from '../constants/api';
import type { ChatSummary } from '../types';
import type { PromptTemplate } from '../utils/chatDesk';
import { ApiError, api, getToken } from './apiClient';

export interface ChatFolder {
  id: string;
  name: string;
  modelId?: string | null;
  systemPrompt?: string;
  documentIds?: string[];
}

export interface ChatPreset {
  id: string;
  name: string;
  tools?: unknown;
  documentIds?: string[];
  updatedAt?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  members?: unknown[];
}

export interface AppBanner {
  id?: string;
  text?: string;
  message?: string;
  body?: string;
}

export interface UserWebhook {
  id?: string;
  url: string;
  events?: string[];
}

export interface ChatQueueItem {
  id: string;
  content?: string;
  text?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function rowsOf<T>(data: unknown, key: string): T[] {
  const record = asRecord(data);
  const value = record[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function bannerText(banner: AppBanner): string {
  return banner.text || banner.message || banner.body || '';
}

export function previewText(value: ChatSummary['preview'] | string | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (!Array.isArray(value)) return '';
  const last = [...value].reverse().find((row) => row?.content?.trim());
  return last?.content?.replace(/\s+/g, ' ').trim() ?? '';
}

export async function searchChats(query: string): Promise<ChatSummary[]> {
  const data = await api<unknown>(`/chats/search?q=${encodeURIComponent(query)}`);
  const record = asRecord(data);
  const rows = record.chats ?? record.results ?? record.matches;
  return Array.isArray(rows) ? (rows as ChatSummary[]) : [];
}

export async function importPinnedIds(chatIds: string[]): Promise<void> {
  if (chatIds.length === 0) return;
  await api('/chats/pins', { method: 'POST', body: JSON.stringify({ chatIds }) });
}

export async function patchChat(chatId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const data = await api<unknown>(`/chats/${encodeURIComponent(chatId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return asRecord(asRecord(data).chat ?? data);
}

export async function rateMessage(chatId: string, messageId: string, rating: 1 | -1 | 0): Promise<void> {
  await api(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/rating`, {
    method: 'PUT',
    body: JSON.stringify({ rating }),
  });
}

export async function listQueue(chatId: string): Promise<ChatQueueItem[]> {
  const data = await api<unknown>(`/chats/${encodeURIComponent(chatId)}/queue`);
  return rowsOf<ChatQueueItem>(data, 'queue');
}

export async function enqueueMessage(chatId: string, content: string): Promise<void> {
  await api(`/chats/${encodeURIComponent(chatId)}/queue`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function removeQueuedMessage(chatId: string, itemId: string): Promise<void> {
  await api(`/chats/${encodeURIComponent(chatId)}/queue/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
}

export async function compactChat(chatId: string): Promise<void> {
  await api(`/chats/${encodeURIComponent(chatId)}/compact`, { method: 'POST', body: '{}' });
}

export async function shareChat(chatId: string, email: string, mode: 'read' | 'reply'): Promise<void> {
  await api(`/chats/${encodeURIComponent(chatId)}/share`, {
    method: 'POST',
    body: JSON.stringify({ email, mode }),
  });
}

export async function chatStatus(chatId: string): Promise<Record<string, unknown>> {
  return asRecord(await api<unknown>(`/chats/${encodeURIComponent(chatId)}/status`));
}

export async function uploadChatFile(chatId: string, file: File, mode: 'full' | 'retrieval'): Promise<void> {
  const body = new FormData();
  body.append('file', file);
  body.append('mode', mode);
  await api(`/chats/${encodeURIComponent(chatId)}/files?mode=${mode}`, { method: 'POST', body });
}

export async function fetchPublicUrl(url: string): Promise<string> {
  const data = await api<unknown>('/tools/fetch-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  const record = asRecord(data);
  const text = record.text ?? record.content ?? record.markdown ?? record.title;
  return typeof text === 'string' && text.trim() ? text : JSON.stringify(record);
}

export async function listPrompts(): Promise<PromptTemplate[]> {
  const data = await api<unknown>('/user/prompts');
  return rowsOf<PromptTemplate>(data, 'prompts');
}

export async function savePrompts(prompts: PromptTemplate[]): Promise<void> {
  await api('/user/prompts', { method: 'PUT', body: JSON.stringify({ prompts }) });
}

export async function expandPrompt(content: string, variables?: Record<string, string>): Promise<string> {
  const data = await api<{ content?: string }>('/user/prompts/expand', {
    method: 'POST',
    body: JSON.stringify({ content, variables: variables ?? {} }),
  });
  return data.content ?? content;
}

export async function listShortcuts(): Promise<Record<string, string>> {
  const data = await api<unknown>('/user/shortcuts');
  const bindings = asRecord(data).bindings;
  if (!bindings || typeof bindings !== 'object') return {};
  return Object.fromEntries(
    Object.entries(bindings as Record<string, unknown>).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value]] : []
    )
  );
}

export async function saveShortcuts(bindings: Record<string, string>): Promise<void> {
  await api('/user/shortcuts', { method: 'PUT', body: JSON.stringify({ bindings }) });
}

export async function listWebhooks(): Promise<UserWebhook[]> {
  const data = await api<unknown>('/user/webhooks');
  return rowsOf<UserWebhook>(data, 'webhooks');
}

export async function createWebhook(url: string, events: string[]): Promise<void> {
  await api('/user/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) });
}

export async function deleteWebhook(id: string): Promise<void> {
  await api(`/user/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listFolders(): Promise<ChatFolder[]> {
  const data = await api<unknown>('/chat-folders');
  return rowsOf<ChatFolder>(data, 'folders');
}

export async function createFolder(input: { name: string; modelId?: string; systemPrompt?: string; documentIds?: string[] }): Promise<void> {
  await api('/chat-folders', { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteFolder(id: string): Promise<void> {
  await api(`/chat-folders/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listPresets(): Promise<ChatPreset[]> {
  const data = await api<unknown>('/presets');
  return rowsOf<ChatPreset>(data, 'presets');
}

export async function createPreset(name: string): Promise<void> {
  await api('/presets', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function snapshotPreset(id: string): Promise<void> {
  await api(`/presets/${encodeURIComponent(id)}`, { method: 'PUT', body: '{}' });
}

export async function restorePreset(id: string): Promise<void> {
  await api(`/presets/${encodeURIComponent(id)}/restore`, { method: 'POST', body: '{}' });
}

export async function listGroups(): Promise<ChatGroup[]> {
  const data = await api<unknown>('/groups');
  return rowsOf<ChatGroup>(data, 'groups');
}

export async function createGroup(name: string): Promise<void> {
  await api('/groups', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function listBanners(): Promise<AppBanner[]> {
  const data = await api<unknown>('/banners');
  return rowsOf<AppBanner>(data, 'banners');
}

export async function createBanner(text: string): Promise<void> {
  await api('/admin/banners', { method: 'POST', body: JSON.stringify({ text }) });
}

export async function adminUsage(day: string): Promise<unknown[]> {
  const data = await api<unknown>(`/admin/usage?day=${encodeURIComponent(day)}`);
  return rowsOf(data, 'usage');
}

export async function adminRatings(): Promise<unknown[]> {
  const data = await api<unknown>('/admin/chat-ratings');
  return rowsOf(data, 'ratings');
}

export async function setupSecondFactor(): Promise<{ secret: string; otpauth: string }> {
  const data = await api<{ secret?: string; otpauth?: string }>('/auth/2fa/setup', { method: 'POST', body: '{}' });
  return { secret: data.secret ?? '', otpauth: data.otpauth ?? '' };
}

export async function confirmSecondFactor(code: string): Promise<void> {
  await api('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) });
}

export async function disableSecondFactor(password: string, code: string): Promise<void> {
  await api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password, code }) });
}

export async function oidcStartAvailable(): Promise<boolean> {
  try {
    await api('/auth/oidc/start');
    return true;
  } catch (error) {
    return !(error instanceof ApiError && (error.code === 'OIDC_DISABLED' || error.status === 404));
  }
}

export function oidcStartUrl(): string {
  const base = resolveChatApiBase().replace(/\/$/, '');
  return `${base}/auth/oidc/start`;
}

const VOICE_FLAG = 'studioxlam_voice_server';

export function serverVoiceDisabled(): boolean {
  return sessionStorage.getItem(VOICE_FLAG) === '0';
}

function rememberVoiceFailure(error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 503 || error.code === 'VOICE_TTS_UNAVAILABLE')) {
    sessionStorage.setItem(VOICE_FLAG, '0');
    return true;
  }
  return false;
}

export async function transcribeBlob(blob: Blob): Promise<string> {
  const body = new FormData();
  body.append('audio', blob, 'speech.webm');
  try {
    const data = await api<{ text?: string; transcript?: string }>('/voice/transcribe', { method: 'POST', body });
    return data.text || data.transcript || '';
  } catch (error) {
    rememberVoiceFailure(error);
    throw error;
  }
}

export async function speakOnServer(text: string): Promise<boolean> {
  if (serverVoiceDisabled()) return false;
  const base = resolveChatApiBase().replace(/\/$/, '');
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${base}/voice/speak`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: text.slice(0, 4000) }),
  });
  if (res.status === 503) {
    sessionStorage.setItem(VOICE_FLAG, '0');
    return false;
  }
  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { error?: string; code?: string };
      message = parsed.error || raw;
      code = parsed.code;
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(message || res.statusText, res.status, code);
  }
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('audio') && !type.includes('octet-stream')) return false;
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
  return true;
}
