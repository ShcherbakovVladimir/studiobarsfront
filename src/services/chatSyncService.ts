import type { ChatMessage, ChatSummary, PersistedChat, UnknownRecord } from '../types';
import { api, getToken, ApiError } from './apiClient';
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
  STORE_PREFIX: 'chats__u_',
  OFFLINE_QUEUE: 'chat_offline_queue',
  LAST_ACTIVE: 'last_active_chat',
} as const;

type LocalChatStore = {
  chats: ChatData[];
  lastActiveId: string | null;
};

const EMPTY_STORE: LocalChatStore = { chats: [], lastActiveId: null };

let scopedUserId: string | null = null;
let memoryStore: { userId: string; data: LocalChatStore } | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncChat: ChatData | null = null;
let lastServerSyncSnapshot = '';
const deletedChatIds = new Set<string>();

export function chatsStorageKey(userId: string): string {
  return `${STORAGE_KEYS.STORE_PREFIX}${userId}`;
}

export function setChatSyncUserId(userId: string | null): void {
  const next = userId && userId.trim() ? userId : null;
  if (scopedUserId && next !== scopedUserId) {
    cancelPendingChatSync();
    lastServerSyncSnapshot = '';
    deletedChatIds.clear();
    memoryStore = null;
  }
  scopedUserId = next;
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

function asStoredChat(value: unknown): ChatData | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null;
  const chat = value as ChatData;
  if (!chat.id || !Array.isArray(chat.messages)) return null;
  return chat;
}

function parseLocalChatStore(raw: string | null): LocalChatStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        chats: parsed.map(asStoredChat).filter((row): row is ChatData => Boolean(row)),
        lastActiveId: null,
      };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as { chats?: unknown; lastActiveId?: unknown };
      const chats = Array.isArray(record.chats)
        ? record.chats.map(asStoredChat).filter((row): row is ChatData => Boolean(row))
        : [];
      return {
        chats,
        lastActiveId: typeof record.lastActiveId === 'string' ? record.lastActiveId : null,
      };
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

function migratePerChatKeys(userId: string): ChatData[] {
  const prefix = userChatPrefix(userId);
  const chats: ChatData[] = [];
  const remove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    remove.push(key);
    try {
      const chat = asStoredChat(JSON.parse(localStorage.getItem(key) ?? 'null'));
      if (chat && isOwnChat(chat, userId)) chats.push(chat);
    } catch {
      /* skip */
    }
  }
  for (const key of remove) localStorage.removeItem(key);
  return chats.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
}

function readLocalChatStore(): LocalChatStore {
  const userId = currentUserId();
  if (!userId) return { ...EMPTY_STORE };
  if (memoryStore?.userId === userId) return memoryStore.data;

  const fromBlob = parseLocalChatStore(localStorage.getItem(chatsStorageKey(userId)));
  const migrated = migratePerChatKeys(userId);
  const lastActiveLegacy = localStorage.getItem(`${STORAGE_KEYS.LAST_ACTIVE}__u_${userId}`);
  if (lastActiveLegacy) localStorage.removeItem(`${STORAGE_KEYS.LAST_ACTIVE}__u_${userId}`);

  const byId = new Map<string, ChatData>();
  for (const chat of migrated) byId.set(chat.id, chat);
  for (const chat of fromBlob?.chats ?? []) byId.set(chat.id, chat);
  const data: LocalChatStore = {
    chats: [...byId.values()].sort(
      (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
    ),
    lastActiveId: fromBlob?.lastActiveId ?? lastActiveLegacy,
  };
  memoryStore = { userId, data };
  if (migrated.length > 0 || lastActiveLegacy) writeLocalChatStore(data);
  return data;
}

function writeLocalChatStore(data: LocalChatStore): void {
  const userId = currentUserId();
  if (!userId) return;
  const owned = data.chats.filter((chat) => !deletedChatIds.has(chat.id) && isOwnChat(chat, userId));
  const next: LocalChatStore = {
    chats: owned,
    lastActiveId:
      data.lastActiveId && owned.some((chat) => chat.id === data.lastActiveId)
        ? data.lastActiveId
        : owned[0]?.id ?? null,
  };
  memoryStore = { userId, data: next };
  localStorage.setItem(chatsStorageKey(userId), JSON.stringify(next));
}

function isUnscopedLegacyChatKey(key: string): boolean {
  if (key.startsWith(STORAGE_KEYS.STORE_PREFIX)) return false;
  if (key.startsWith(STORAGE_KEYS.USER_CHAT_PREFIX)) return false;
  if (key.startsWith(`${STORAGE_KEYS.LAST_ACTIVE}__u_`)) return false;
  if (key === STORAGE_KEYS.LAST_ACTIVE) return true;
  if (key === STORAGE_KEYS.LAST_SYNC || key === STORAGE_KEYS.OFFLINE_QUEUE) return true;
  return key.startsWith(STORAGE_KEYS.CHAT_PREFIX);
}

/** Drop unscoped leftovers from a previous email. Never copy them into chats__u_{userId}. */
export function cleanupLegacyStorage(): void {
  const remove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (LEGACY_STORAGE_KEYS.includes(key as (typeof LEGACY_STORAGE_KEYS)[number]) || isUnscopedLegacyChatKey(key))) {
      remove.push(key);
    }
  }
  for (const key of remove) localStorage.removeItem(key);
}

export function clearLocalChatStore(userId?: string | null): void {
  cancelPendingChatSync();
  lastServerSyncSnapshot = '';
  deletedChatIds.clear();
  const id = userId ?? currentUserId();
  memoryStore = null;
  if (id) {
    localStorage.removeItem(chatsStorageKey(id));
    localStorage.removeItem(`${STORAGE_KEYS.LAST_ACTIVE}__u_${id}`);
    const prefix = userChatPrefix(id);
    const remove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) remove.push(key);
    }
    for (const key of remove) localStorage.removeItem(key);
  }
  cleanupLegacyStorage();
}

export function getAllLocalChats(): ChatData[] {
  const userId = currentUserId();
  if (!userId) return [];
  return readLocalChatStore().chats.filter((chat) => isOwnChat(chat, userId));
}

export function loadChatFromLocal(chatId: string): ChatData | null {
  return readLocalChatStore().chats.find((chat) => chat.id === chatId) ?? null;
}

export function saveChatToLocal(chat: ChatData): void {
  if (deletedChatIds.has(chat.id)) return;
  const userId = currentUserId();
  if (!userId) return;
  const next: ChatData = {
    ...chat,
    metadata: { ...(chat.metadata ?? {}), ownerUserId: userId },
  };
  const store = readLocalChatStore();
  const chats = store.chats.filter((row) => row.id !== next.id);
  chats.unshift(next);
  writeLocalChatStore({ ...store, chats });
}

export function deleteChatFromLocal(chatId: string): void {
  const store = readLocalChatStore();
  writeLocalChatStore({
    ...store,
    chats: store.chats.filter((chat) => chat.id !== chatId),
    lastActiveId: store.lastActiveId === chatId ? null : store.lastActiveId,
  });
}

export async function listChatSummaries(): Promise<ChatSummary[]> {
  const data = await api<{
    success: boolean;
    chats: Array<ChatSummary & { user_id?: string }>;
    userId?: string;
    email?: string;
    role?: string;
    total: number;
  }>('/chats?summary=true');
  const myId = currentUserId();
  if (data.userId && myId && data.userId !== myId) {
    console.warn('GET /chats userId mismatch — ignoring list');
    return [];
  }
  const ownerId = myId ?? data.userId ?? null;
  return (data.chats ?? []).filter((chat) => isOwnChat(chat, ownerId));
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

export function isDeletedChatId(chatId: string): boolean {
  return deletedChatIds.has(chatId);
}

export async function getChatFromServer(chatId: string): Promise<ChatData | null> {
  if (deletedChatIds.has(chatId)) return null;
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
  if (deletedChatIds.has(chat.id)) return false;
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
    if (data.duplicated) return true;
    return data.success && data.synced !== false;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 409 || error.code === 'CHAT_ID_FOREIGN')) {
      console.warn('CHAT_ID_FOREIGN: not copying chat id', chat.id);
      return false;
    }
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
  if (deletedChatIds.has(chat.id)) return;
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

  // Server wins. sync-batch only for chats__u_{thisUserId}, never another email's store.
  if (listOk && summaries.length === 0) {
    const ownLocal = getAllLocalChats();
    if (ownLocal.length > 0) {
      await syncOwnLocalChats();
      try {
        summaries = await listChatSummaries();
      } catch (error) {
        console.warn('restoreChatList: re-list after sync-batch failed', getErrorMessage(error));
      }
    }
  } else if (!listOk) {
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

  const chats = summaries
    .map(summaryToChat)
    .filter((chat) => !deletedChatIds.has(chat.id));
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

  if (listOk) {
    writeLocalChatStore({
      chats,
      lastActiveId: active?.id ?? null,
    });
  }

  return { chats, active };
}

export async function syncOwnLocalChats(): Promise<SyncResult> {
  const chats = getAllLocalChats();
  if (chats.length === 0) return { success: true, synced: 0 };

  try {
    const data = await api<{
      success?: boolean;
      synced?: number;
      conflicts?: Array<{
        id?: string;
        conflictReason?: string;
        clientVersion?: ChatData;
      }>;
    }>('/chats/sync-batch', {
      method: 'POST',
      body: JSON.stringify({
        chats: chats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          modelId: chat.modelId,
          sessionId: chat.sessionId ?? chat.id,
          messages: messagesForSync(chat.messages ?? []),
          systemPrompt: chat.systemPrompt,
          chatWrapper: chat.chatWrapper,
          updatedAt: chat.updatedAt ?? new Date().toISOString(),
        })),
      }),
    });

    for (const conflict of data.conflicts ?? []) {
      if (conflict.conflictReason !== 'foreign_user') continue;
      const source = conflict.clientVersion ?? (conflict.id ? loadChatFromLocal(conflict.id) : null);
      if (!source) continue;
      deleteChatFromLocal(source.id);
      const remintedId = createChatId();
      const reminted: ChatData = {
        ...source,
        id: remintedId,
        sessionId: remintedId,
        updatedAt: new Date().toISOString(),
      };
      await saveChatToServer(reminted);
    }

    return { success: true, synced: data.synced ?? chats.length };
  } catch (error) {
    console.warn('sync-batch failed', getErrorMessage(error));
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function syncToServer(): Promise<SyncResult> {
  return syncOwnLocalChats();
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
  deletedChatIds.add(chatId);
  cancelPendingChatSync(chatId);
  deleteChatFromLocal(chatId);
  try {
    await api(`/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return;
    deletedChatIds.delete(chatId);
    throw error;
  }
}

export function createNewChat(modelId: string, sessionId?: string, title?: string): ChatData {
  const id = createChatId();
  deletedChatIds.delete(id);
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
  if (deletedChatIds.has(chat.id)) return false;
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
  const store = readLocalChatStore();
  writeLocalChatStore({ ...store, lastActiveId: chatId });
}

export function getLastActiveChat(): string | null {
  return readLocalChatStore().lastActiveId;
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
  syncOwnLocalChats,
  loadFromServer,
  getChatFromServer,
  listChatSummaries,
  deleteChat,
  isDeletedChatId,
  setLastActiveChat,
  getLastActiveChat,
  cleanupLegacyStorage,
  clearLocalChatStore,
  chatsStorageKey,
  setChatSyncUserId,
  toChatMessages,
};

export default chatSyncService;
