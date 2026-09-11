import type { ChatMessage, ChatSummary, PersistedChat, UnknownRecord } from '../types';
import { api, getToken } from './apiClient';
import { getErrorMessage } from '../utils/errorUtils';
import { LEGACY_STORAGE_KEYS } from '../constants/auth';
import { persistableVisionContent } from '../utils/chatVision';

export type ChatData = PersistedChat;

export interface ConflictInfo {
  id: string;
  title: string;
  serverVersion: ChatData;
  clientVersion: ChatData;
  conflictReason: 'server_has_newer_version' | 'client_has_newer_version' | 'both_modified';
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  conflicts?: ConflictInfo[];
  message?: string;
}

const STORAGE_KEYS = {
  LAST_SYNC: 'chat_last_sync',
  CHAT_PREFIX: 'chat_',
  USER_CHAT_PREFIX: 'chat__u_',
  OFFLINE_QUEUE: 'chat_offline_queue',
  LAST_ACTIVE: 'last_active_chat',
} as const;

const LOCAL_META_SUFFIXES = new Set(['last_sync', 'offline_queue', 'user_id']);

let scopedUserId: string | null = null;

export function setChatSyncUserId(userId: string | null): void {
  scopedUserId = userId && userId.trim() ? userId : null;
}

function readJwtUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return null;
  try {
    const padded = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    const id = payload.sub ?? payload.userId ?? payload.id;
    return typeof id === 'string' && id.trim() ? id : null;
  } catch {
    return null;
  }
}

function currentUserId(): string | null {
  return scopedUserId ?? readJwtUserId();
}

function userChatPrefix(userId: string): string {
  return `${STORAGE_KEYS.USER_CHAT_PREFIX}${userId}_`;
}

function lastActiveStorageKey(): string {
  const userId = currentUserId();
  return userId ? `${STORAGE_KEYS.LAST_ACTIVE}__u_${userId}` : STORAGE_KEYS.LAST_ACTIVE;
}

function chatOwnerId(chat: { userId?: string; user_id?: string; metadata?: UnknownRecord } | ChatSummary): string | null {
  const row = chat as { userId?: string; user_id?: string; metadata?: { ownerUserId?: string } };
  const fromMeta = row.metadata?.ownerUserId;
  const owner = row.userId ?? row.user_id ?? (typeof fromMeta === 'string' ? fromMeta : null);
  return owner && owner.trim() ? owner : null;
}

function isOwnChat(
  chat: { userId?: string; user_id?: string; metadata?: UnknownRecord } | ChatSummary,
  myId: string | null
): boolean {
  const owner = chatOwnerId(chat);
  if (!owner || !myId) return true;
  return owner === myId;
}

const SYNC_DEBOUNCE_MS = 600;

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncChat: ChatData | null = null;
let lastServerSyncSnapshot = '';

function chatSyncSnapshot(chat: ChatData): string {
  return JSON.stringify({
    id: chat.id,
    title: chat.title,
    modelId: chat.modelId,
    sessionId: chat.sessionId ?? chat.id,
    messages: chat.messages,
    systemPrompt: chat.systemPrompt,
    chatWrapper: chat.chatWrapper,
  });
}

export function createChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createRagSessionId(): string {
  return `rag_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function cleanupLegacyStorage(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem('chat_user_id');
}

function getChatKey(chatId: string): string {
  const userId = currentUserId();
  if (userId) return `${userChatPrefix(userId)}${chatId}`;
  return `${STORAGE_KEYS.CHAT_PREFIX}${chatId}`;
}

export function getAllLocalChats(): ChatData[] {
  const userId = currentUserId();
  const chats: ChatData[] = [];
  if (!userId) return chats;

  const prefix = userChatPrefix(userId);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const chatId = key.slice(prefix.length);
    if (!chatId || LOCAL_META_SUFFIXES.has(chatId)) continue;
    const chat = loadChatFromLocal(chatId);
    if (chat && isOwnChat(chat, userId)) chats.push(chat);
  }
  return chats.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
}

export function loadChatFromLocal(chatId: string): ChatData | null {
  try {
    const raw = localStorage.getItem(getChatKey(chatId));
    if (!raw) return null;
    return JSON.parse(raw) as ChatData;
  } catch {
    return null;
  }
}

export function saveChatToLocal(chat: ChatData): void {
  const userId = currentUserId();
  const next: ChatData = userId
    ? {
        ...chat,
        metadata: { ...(chat.metadata ?? {}), ownerUserId: userId },
      }
    : chat;
  localStorage.setItem(getChatKey(next.id), JSON.stringify(next));
}

export function deleteChatFromLocal(chatId: string): void {
  localStorage.removeItem(getChatKey(chatId));
}

export async function listChatSummaries(): Promise<ChatSummary[]> {
  const data = await api<{
    success: boolean;
    chats: Array<ChatSummary & { user_id?: string }>;
    userId?: string;
    total: number;
  }>('/chats?summary=true');
  const myId = currentUserId() ?? data.userId ?? null;
  return (data.chats ?? []).filter((chat) => isOwnChat(chat, myId));
}

function messagesForSync(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => {
    const imageCount = message.images?.length ?? 0;
    const rest = { ...message };
    delete rest.images;
    return {
      ...rest,
      content: persistableVisionContent(rest.content, imageCount),
    };
  });
}

export async function getChatFromServer(chatId: string): Promise<ChatData | null> {
  try {
    const data = await api<{ success: boolean; chat: ChatData }>(`/chats/${encodeURIComponent(chatId)}`);
    const chat = data.chat;
    if (!chat) return null;
    if (!isOwnChat(chat, currentUserId())) return null;
    saveChatToLocal(chat);
    return chat;
  } catch {
    return null;
  }
}

export async function saveChatToServer(chat: ChatData): Promise<boolean> {
  try {
    const payload = {
      chat: {
        id: chat.id,
        title: chat.title,
        modelId: chat.modelId,
        sessionId: chat.sessionId ?? chat.id,
        messages: messagesForSync(chat.messages),
        systemPrompt: chat.systemPrompt,
        chatWrapper: chat.chatWrapper,
        updatedAt: chat.updatedAt ?? new Date().toISOString(),
      },
    };
    const data = await api<{ success: boolean; synced?: boolean; duplicated?: boolean }>('/chats/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    if (data.duplicated) return true;
    return data.success && data.synced !== false;
  } catch (error) {
    console.error('saveChatToServer failed:', getErrorMessage(error));
    return false;
  }
}

export async function flushPendingChatSync(): Promise<void> {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  const pending = pendingSyncChat;
  pendingSyncChat = null;
  if (!pending) return;
  const snapshot = chatSyncSnapshot(pending);
  const ok = await saveChatToServer(pending);
  if (ok) lastServerSyncSnapshot = snapshot;
}

export function scheduleChatSync(chat: ChatData): void {
  const snapshot = chatSyncSnapshot(chat);
  saveChatToLocal(chat);

  if (snapshot === lastServerSyncSnapshot) {
    return;
  }

  pendingSyncChat = chat;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    void flushPendingChatSync();
  }, SYNC_DEBOUNCE_MS);
}

function summaryToChat(summary: ChatSummary): ChatData {
  const local = loadChatFromLocal(summary.id);
  const messageCount = summary.messageCount ?? local?.messages?.length ?? 0;
  return {
    id: summary.id,
    title: summary.title ?? local?.title ?? 'Новый чат',
    modelId: summary.modelId ?? local?.modelId ?? '',
    sessionId: summary.sessionId ?? local?.sessionId ?? summary.id,
    messages: local?.messages ?? [],
    messageCount,
    systemPrompt: local?.systemPrompt ?? '',
    chatWrapper: local?.chatWrapper ?? 'default',
    createdAt: summary.createdAt ?? local?.createdAt,
    updatedAt: summary.updatedAt ?? local?.updatedAt,
  };
}

/** Server-first restore: GET /chats?summary=true → GET /chats/:id for the open chat. */
export async function restoreChatList(activeChatId?: string | null): Promise<{
  chats: ChatData[];
  active: ChatData | null;
}> {
  let summaries: ChatSummary[] = [];
  let listOk = false;
  try {
    summaries = await listChatSummaries();
    listOk = true;
  } catch (error) {
    console.warn('restoreChatList: summary failed, using local', getErrorMessage(error));
  }

  // Never POST /chats/sync-batch after login. Empty GET means this JWT has no chats.
  // Own scoped local cache may be shown only when the list request itself failed.
  if (!listOk && summaries.length === 0) {
    summaries = getAllLocalChats().map((chat) => ({
      id: chat.id,
      title: chat.title,
      modelId: chat.modelId,
      sessionId: chat.sessionId ?? chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messageCount ?? chat.messages.length,
    }));
  }

  const chats = summaries.map(summaryToChat);
  const preferredId = activeChatId || getLastActiveChat() || chats[0]?.id || null;
  let active = preferredId ? chats.find((chat) => chat.id === preferredId) ?? chats[0] ?? null : chats[0] ?? null;

  if (active) {
    const full = await getChatFromServer(active.id);
    if (full) {
      active = {
        ...full,
        sessionId: full.sessionId || full.id,
        messageCount: full.messages?.length ?? full.messageCount ?? active.messageCount,
      };
      const index = chats.findIndex((chat) => chat.id === active?.id);
      if (index >= 0) chats[index] = active;
    }
  }

  return { chats, active };
}

export async function syncToServer(): Promise<SyncResult> {
  return { success: true, synced: 0, message: 'sync-batch disabled' };
}

export async function loadFromServer(): Promise<ChatData[]> {
  const summaries = await listChatSummaries();
  const chats: ChatData[] = [];
  for (const summary of summaries) {
    const full = await getChatFromServer(summary.id);
    if (full) {
      chats.push(full);
    } else {
      chats.push({
        id: summary.id,
        title: summary.title ?? 'Чат',
        modelId: summary.modelId ?? '',
        sessionId: summary.sessionId ?? summary.id,
        messages: [],
        systemPrompt: '',
        chatWrapper: 'default',
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
      });
    }
  }
  return chats;
}

export function cancelPendingChatSync(chatId?: string): void {
  if (chatId && pendingSyncChat && pendingSyncChat.id !== chatId) return;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  pendingSyncChat = null;
}

export async function deleteChat(chatId: string): Promise<void> {
  cancelPendingChatSync(chatId);
  deleteChatFromLocal(chatId);
  try {
    await api(`/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE' });
  } catch (error) {
    console.warn('deleteChat server error:', getErrorMessage(error));
  }
}

export function createNewChat(modelId: string, sessionId?: string, title?: string): ChatData {
  const id = createChatId();
  const now = new Date().toISOString();
  return {
    id,
    modelId,
    sessionId: sessionId ?? id,
    title: title ?? 'Новый чат',
    messages: [],
    messageCount: 0,
    systemPrompt: '',
    chatWrapper: 'default',
    createdAt: now,
    updatedAt: now,
  };
}

export async function persistChat(chat: ChatData, immediate = false): Promise<boolean> {
  const messages = messagesForSync(chat.messages ?? []);
  const next: ChatData = {
    ...chat,
    sessionId: chat.sessionId ?? chat.id,
    updatedAt: new Date().toISOString(),
    messages,
    messageCount: messages.length,
  };
  saveChatToLocal(next);
  if (immediate) {
    const snapshot = chatSyncSnapshot(next);
    const ok = await saveChatToServer(next);
    if (ok) lastServerSyncSnapshot = snapshot;
    return ok;
  }
  scheduleChatSync(next);
  return true;
}

/** Rename via POST /chats/sync. Never send empty messages if the chat already has history. */
export async function renameChatOnServer(
  chatId: string,
  title: string,
  liveMessages?: ChatMessage[]
): Promise<ChatData | null> {
  const local = loadChatFromLocal(chatId);
  let messages = liveMessages;
  const localCount = local?.messages?.length ?? 0;
  if (!messages || (messages.length === 0 && localCount > 0)) {
    const full = await getChatFromServer(chatId);
    messages = full?.messages ?? local?.messages ?? [];
  }
  if ((messages?.length ?? 0) === 0) {
    const full = await getChatFromServer(chatId);
    if (full?.messages?.length) messages = full.messages;
  }

  const base = local ?? (messages ? { id: chatId, messages } : null);
  const fullBase = local ?? (await getChatFromServer(chatId));
  if (!fullBase && !base) return null;

  const source = fullBase ?? {
    id: chatId,
    title: 'Новый чат',
    messages: messages ?? [],
    sessionId: chatId,
  };

  const next: ChatData = {
    ...source,
    id: chatId,
    title: title.trim() || 'Новый чат',
    messages: messages ?? source.messages ?? [],
    sessionId: source.sessionId ?? chatId,
    updatedAt: new Date().toISOString(),
  };
  next.messageCount = next.messages.length;
  await persistChat(next, true);
  return next;
}

export function saveChat(chat: ChatData): void {
  void persistChat(chat, false);
}

export function setLastActiveChat(chatId: string): void {
  localStorage.setItem(lastActiveStorageKey(), chatId);
}

export function getLastActiveChat(): string | null {
  return localStorage.getItem(lastActiveStorageKey())
    ?? localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
}

export function toChatMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    .map((m) => ({ role: m.role, content: m.content }));
}

/** @deprecated Use named exports; kept for gradual migration */
export const chatSyncService = {
  createChatId,
  createNewChat,
  getAllLocalChats,
  loadChatFromLocal,
  saveChatToLocal,
  saveChatToServer,
  saveChat,
  persistChat,
  renameChatOnServer,
  cancelPendingChatSync,
  scheduleChatSync,
  flushPendingChatSync,
  restoreChatList,
  syncToServer,
  loadFromServer,
  getChatFromServer,
  listChatSummaries,
  deleteChat,
  setLastActiveChat,
  getLastActiveChat,
  cleanupLegacyStorage,
  setChatSyncUserId,
  toChatMessages,
};

export default chatSyncService;
