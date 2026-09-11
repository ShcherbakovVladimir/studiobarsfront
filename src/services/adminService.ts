import { api, ApiError, getChatApiBase, getToken, buildUrlForDownload } from './apiClient';
import type {
  AdminAuditEvent,
  AdminBackupItem,
  AdminChatRow,
  AdminConversationListParams,
  AdminDashboardData,
  AdminMailSettings,
  AdminMaintenanceSettings,
  AdminReindexStatus,
  AdminSessionRow,
  AdminUser,
  AdminUserChatUpdateBody,
  ChatMessage,
  ChatSummary,
  PersistedChat,
  RuntimeConfig,
  UnknownRecord,
  UserRole,
} from '../types';

function adminPath(path: string): string {
  return path.startsWith('/admin') ? path : `/admin${path.startsWith('/') ? path : `/${path}`}`;
}

function queryString(params?: Record<string, string | number | boolean | undefined | null> | object): string {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

async function downloadAdminFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = buildUrlForDownload(getChatApiBase(), adminPath(path));
  const res = await fetch(url, { headers });

  if (res.status === 401) {
    throw new ApiError('UNAUTHORIZED', 401, 'UNAUTHORIZED');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
    throw new ApiError(data.error ?? res.statusText, res.status, data.code, data);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export const adminService = {
  getDashboard: () =>
    api<{ success: boolean; dashboard: AdminDashboardData }>(adminPath('/dashboard')),

  listUsers: async (params?: { limit?: number; offset?: number; search?: string; page?: number }) => {
    const limit = params?.limit ?? 50;
    const page =
      params?.page ??
      (params?.offset != null ? Math.floor(params.offset / limit) + 1 : 1);
    const res = await api<{ success: boolean; users?: AdminUser[]; total?: number }>(
      adminPath(`/users${queryString({ page, limit, search: params?.search })}`)
    );
    const users = Array.isArray(res.users) ? res.users : [];
    return {
      ...res,
      users,
      total: res.total ?? users.length,
    };
  },

  getUser: (userId: string) =>
    api<{ success: boolean; user: AdminUser }>(adminPath(`/users/${userId}`)),

  createUser: (body: {
    email: string;
    password: string;
    role?: UserRole;
    displayName?: string;
    emailVerified?: boolean;
    sendInvite?: boolean;
  }) =>
    api<{ success: boolean; user: AdminUser }>(adminPath('/users'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateUser: (
    userId: string,
    body: Partial<Pick<AdminUser, 'role' | 'displayName' | 'emailVerified' | 'isActive'>>
  ) =>
    api<{ success: boolean; user: AdminUser }>(adminPath(`/users/${userId}`), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  updateUserSettings: (userId: string, settings: { inferenceLab?: boolean }) =>
    api<{ success: boolean; settings?: import('../types').UserSettings }>(
      adminPath(`/users/${userId}/settings`),
      {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }
    ),

  deleteUser: (userId: string) =>
    api<{ success: boolean; message?: string }>(adminPath(`/users/${userId}`), {
      method: 'DELETE',
    }),

  resetUserPassword: (userId: string, password?: string) =>
    api<{ success: boolean; message?: string; temporaryPassword?: string }>(
      adminPath(`/users/${userId}/reset-password`),
      {
        method: 'POST',
        body: JSON.stringify(password ? { password } : {}),
      }
    ),

  getUserChats: (userId: string, params?: { summary?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.summary) query.set('summary', 'true');
    const qs = query.toString();
    return api<{ success: boolean; chats: ChatSummary[]; total?: number }>(
      adminPath(`/users/${userId}/chats${qs ? `?${qs}` : ''}`)
    );
  },

  getUserChat: (userId: string, chatId: string) =>
    api<{ success: boolean; chat: PersistedChat }>(
      adminPath(`/users/${userId}/chats/${encodeURIComponent(chatId)}`)
    ),

  updateUserChat: (userId: string, chatId: string, body: AdminUserChatUpdateBody) =>
    api<{ success: boolean; chat: PersistedChat }>(
      adminPath(`/users/${userId}/chats/${encodeURIComponent(chatId)}`),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    ),

  updateUserChatMessage: (
    userId: string,
    chatId: string,
    messageIndex: number,
    body: Partial<Pick<ChatMessage, 'content' | 'role'>>
  ) =>
    api<{ success: boolean; chat: PersistedChat }>(
      adminPath(
        `/users/${userId}/chats/${encodeURIComponent(chatId)}/messages/${messageIndex}`
      ),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    ),

  deleteUserChatMessage: (userId: string, chatId: string, messageIndex: number) =>
    api<{ success: boolean; chat: PersistedChat }>(
      adminPath(
        `/users/${userId}/chats/${encodeURIComponent(chatId)}/messages/${messageIndex}`
      ),
      { method: 'DELETE' }
    ),

  deleteUserChat: (userId: string, chatId: string) =>
    api<{ success: boolean }>(adminPath(`/users/${userId}/chats/${chatId}`), {
      method: 'DELETE',
    }),

  listAllChats: async (params: AdminConversationListParams = {}) => {
    const res = await api<{
      success: boolean;
      chats?: AdminChatRow[];
      total?: number;
      page?: number;
      limit?: number;
    }>(adminPath(`/chats${queryString(params)}`));
    const chats = Array.isArray(res.chats) ? res.chats : [];
    return { ...res, chats, total: res.total ?? chats.length, page: res.page ?? 1, limit: res.limit ?? 50 };
  },

  getAllChatsStats: () => api<{ success: boolean; stats?: unknown }>(adminPath('/chats/stats')),

  getChatRow: (rowId: string) =>
    api<{ success: boolean; chat?: PersistedChat & AdminChatRow }>(
      adminPath(`/chats/row/${encodeURIComponent(rowId)}`)
    ),

  downloadChatRow: (rowId: string, filename?: string) =>
    downloadAdminFile(`/chats/row/${encodeURIComponent(rowId)}/download`, filename ?? `chat-${rowId}.json`),

  backupChats: (body: AdminConversationListParams = {}) =>
    api<{ success: boolean; backup?: AdminBackupItem }>(adminPath('/chats/backup'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  restoreChats: (body: UnknownRecord) =>
    api<{ success: boolean; restored?: number; skipped?: number }>(adminPath('/chats/restore'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteChatRow: (rowId: string) =>
    api<{ success: boolean }>(adminPath(`/chats/row/${encodeURIComponent(rowId)}`), { method: 'DELETE' }),

  reassignChatRow: (rowId: string, newUserId: string, overwrite = false) =>
    api<{ success: boolean }>(adminPath(`/chats/row/${encodeURIComponent(rowId)}/reassign`), {
      method: 'POST',
      body: JSON.stringify({ newUserId, overwrite }),
    }),

  patchChatRow: (rowId: string, body: AdminUserChatUpdateBody) =>
    api<{ success: boolean; chat?: PersistedChat }>(adminPath(`/chats/row/${encodeURIComponent(rowId)}`), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  listAllSessions: async (params: AdminConversationListParams = {}) => {
    const res = await api<{
      success: boolean;
      sessions?: AdminSessionRow[];
      total?: number;
      page?: number;
      limit?: number;
    }>(adminPath(`/sessions${queryString(params)}`));
    const sessions = Array.isArray(res.sessions) ? res.sessions : [];
    return {
      ...res,
      sessions,
      total: res.total ?? sessions.length,
      page: res.page ?? 1,
      limit: res.limit ?? 50,
    };
  },

  getAllSessionsStats: () => api<{ success: boolean; stats?: unknown }>(adminPath('/sessions/stats')),

  getSessionRow: (rowId: string) =>
    api<{ success: boolean; session?: AdminSessionRow; history?: ChatMessage[] }>(
      adminPath(`/sessions/row/${encodeURIComponent(rowId)}`)
    ),

  downloadSessionRow: (rowId: string, filename?: string) =>
    downloadAdminFile(
      `/sessions/row/${encodeURIComponent(rowId)}/download`,
      filename ?? `session-${rowId}.json`
    ),

  backupSessions: (body: AdminConversationListParams = {}) =>
    api<{ success: boolean; backup?: AdminBackupItem }>(adminPath('/sessions/backup'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  restoreSessions: (body: UnknownRecord) =>
    api<{ success: boolean; restored?: number; skipped?: number }>(adminPath('/sessions/restore'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteSessionRow: (rowId: string) =>
    api<{ success: boolean }>(adminPath(`/sessions/row/${encodeURIComponent(rowId)}`), {
      method: 'DELETE',
    }),

  createSession: (body: { userId: string; title?: string; sessionId?: string }) =>
    api<{ success: boolean; session?: AdminSessionRow }>(adminPath('/sessions'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patchSessionRow: (rowId: string, body: { title?: string }) =>
    api<{ success: boolean; session?: AdminSessionRow }>(
      adminPath(`/sessions/row/${encodeURIComponent(rowId)}`),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    ),

  reassignSessionRow: (rowId: string, newUserId: string, overwrite = false) =>
    api<{ success: boolean }>(adminPath(`/sessions/row/${encodeURIComponent(rowId)}/reassign`), {
      method: 'POST',
      body: JSON.stringify({ newUserId, overwrite }),
    }),

  getSettings: () =>
    api<{ success: boolean; settings: RuntimeConfig }>(adminPath('/settings')),

  updateSettings: (settings: Partial<RuntimeConfig>) =>
    api<{ success: boolean; settings: RuntimeConfig }>(adminPath('/settings'), {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  getMailSettings: () =>
    api<{ success: boolean; settings: AdminMailSettings }>(adminPath('/mail/settings')),

  updateMailSettings: (settings: AdminMailSettings) =>
    api<{ success: boolean; settings: AdminMailSettings }>(adminPath('/mail/settings'), {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  testMail: (to?: string) =>
    api<{ success: boolean; message?: string }>(adminPath('/mail/test'), {
      method: 'POST',
      body: JSON.stringify(to ? { to } : {}),
    }),

  listAuditEvents: async (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.offset != null) query.set('offset', String(params.offset));
    const qs = query.toString();
    const res = await api<{ success: boolean; events?: AdminAuditEvent[]; total?: number }>(
      adminPath(`/audit/events${qs ? `?${qs}` : ''}`)
    );
    const events = Array.isArray(res.events) ? res.events : [];
    return {
      ...res,
      events,
      total: res.total ?? events.length,
    };
  },

  getMaintenance: () =>
    api<{ success: boolean; maintenance: AdminMaintenanceSettings }>(
      adminPath('/maintenance')
    ),

  updateMaintenance: (maintenance: Partial<AdminMaintenanceSettings>) =>
    api<{ success: boolean; maintenance: AdminMaintenanceSettings }>(
      adminPath('/maintenance'),
      {
        method: 'PATCH',
        body: JSON.stringify(maintenance),
      }
    ),

  getReindexStatus: () =>
    api<{ success: boolean; reindex: AdminReindexStatus }>(
      adminPath('/maintenance/reindex')
    ),

  startReindex: () =>
    api<{ success: boolean; reindex: AdminReindexStatus }>(
      adminPath('/maintenance/reindex'),
      { method: 'POST' }
    ),

  listBackups: async () => {
    const res = await api<{ success: boolean; backups?: AdminBackupItem[] }>(adminPath('/backups'));
    return {
      ...res,
      backups: Array.isArray(res.backups) ? res.backups : [],
    };
  },

  createPostgresBackup: () =>
    api<{ success: boolean; backup: AdminBackupItem }>(adminPath('/backups/postgres'), {
      method: 'POST',
    }),

  createRagBackup: () =>
    api<{ success: boolean; backup: AdminBackupItem }>(adminPath('/backups/rag'), {
      method: 'POST',
    }),

  downloadBackup: (backupId: string, filename?: string) =>
    downloadAdminFile(`/backups/${backupId}/download`, filename ?? `backup-${backupId}.zip`),

  exportReport: (format: 'pdf' | 'json' = 'pdf') =>
    downloadAdminFile(`/reports/export?format=${format}`, `report.${format}`),
};

export default adminService;
