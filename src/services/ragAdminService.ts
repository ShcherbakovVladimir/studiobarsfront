import { ragApi, buildUrlForDownload, getRagApiBase, getToken } from './apiClient';
import { getErrorMessage } from '../utils/errorUtils';
import type { RagSession, UnknownRecord } from '../types';

export interface RagAdminListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RagAdminUsageParams {
  period?: string;
}

export interface RagAdminMonitoringParams {
  period?: string;
}

async function ragAdminDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = buildUrlForDownload(getRagApiBase(), `/api/rag${path.startsWith('/') ? path : `/${path}`}`);
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Download failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export const ragAdminService = {
  async getUserSessions(userId: string, params: RagAdminListParams = {}): Promise<UnknownRecord> {
    try {
      const qs = new URLSearchParams();
      if (params.page != null) qs.set('page', String(params.page));
      if (params.limit != null) qs.set('limit', String(params.limit));
      if (params.search) qs.set('search', params.search);
      const suffix = qs.toString() ? `?${qs}` : '';
      return await ragApi(`/admin/users/${encodeURIComponent(userId)}/sessions${suffix}`);
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getUserStats(userId: string): Promise<UnknownRecord> {
    try {
      return await ragApi(`/admin/users/${encodeURIComponent(userId)}/stats`);
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getUserSession(userId: string, chatId: string): Promise<{ success: boolean; session?: RagSession; error?: string }> {
    try {
      return await ragApi(`/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(chatId)}`);
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async deleteUserSession(userId: string, chatId: string): Promise<UnknownRecord> {
    try {
      return await ragApi(`/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async deleteSessionMessage(userId: string, chatId: string, messageId: string): Promise<UnknownRecord> {
    try {
      return await ragApi(
        `/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async moderateSessionMessage(
    userId: string,
    chatId: string,
    messageId: string,
    body: UnknownRecord
  ): Promise<UnknownRecord> {
    try {
      return await ragApi(
        `/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getUsageReport(params: RagAdminUsageParams = {}): Promise<UnknownRecord> {
    try {
      const qs = params.period ? `?period=${encodeURIComponent(params.period)}` : '';
      return await ragApi(`/admin/reports/usage${qs}`);
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async startReindex(body?: UnknownRecord): Promise<UnknownRecord> {
    try {
      return await ragApi('/admin/reindex', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getReindexStatus(): Promise<UnknownRecord> {
    try {
      return await ragApi('/admin/reindex');
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async exportData(body?: UnknownRecord): Promise<UnknownRecord> {
    try {
      return await ragApi('/admin/export', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      });
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getMetricsHistory(): Promise<UnknownRecord> {
    try {
      return await ragApi('/metrics/history');
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getMonitoringTimeseries(): Promise<UnknownRecord> {
    try {
      return await ragApi('/monitoring/timeseries');
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getMonitoringUptime(params: RagAdminMonitoringParams = {}): Promise<UnknownRecord> {
    try {
      const qs = params.period ? `?period=${encodeURIComponent(params.period)}` : '';
      return await ragApi(`/monitoring/uptime${qs}`);
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getAdminLogs(): Promise<UnknownRecord> {
    try {
      return await ragApi('/admin/logs');
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getLogs(): Promise<UnknownRecord> {
    try {
      return await ragApi('/logs');
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async downloadExport(filename = 'rag-export.json'): Promise<void> {
    await ragAdminDownload('/admin/export/download', filename);
  },
};

export default ragAdminService;
