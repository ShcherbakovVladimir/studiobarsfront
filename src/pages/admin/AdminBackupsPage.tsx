import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, Plus, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminBackupItem } from '../../types';
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminWorkspace,
  adminBtnGhost,
} from './adminUi';
import { formatAdminDate, getErrorMessage } from './adminUtils';
import { EmptyState } from '../../components/ui/page-states';
import { StatusPill } from '../../components/ui/status-pill';

function formatSize(bytes?: number): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function backupStatus(status?: string): 'success' | 'info' | 'error' | 'neutral' {
  const value = (status ?? '').toLowerCase();
  if (['ready', 'done', 'completed', 'success'].includes(value)) return 'success';
  if (['running', 'creating', 'pending'].includes(value)) return 'info';
  if (['error', 'failed'].includes(value)) return 'error';
  return 'neutral';
}

const AdminBackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<AdminBackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listBackups();
      setBackups(res.backups ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (type: 'postgres' | 'rag') => {
    setCreating(type);
    setError(null);
    try {
      if (type === 'postgres') {
        await adminService.createPostgresBackup();
      } else {
        await adminService.createRagBackup();
      }
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(null);
    }
  };

  const handleDownload = async (backup: AdminBackupItem) => {
    try {
      await adminService.downloadBackup(backup.id, backup.filename);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AdminWorkspace
      title="Бэкапы"
      description="PostgreSQL и RAG"
      actions={
        <>
          <button
            type="button"
            onClick={() => void handleCreate('postgres')}
            disabled={creating !== null}
            className={adminBtnGhost}
          >
            <Plus className="w-3.5 h-3.5" />
            {creating === 'postgres' ? 'Создание…' : 'PostgreSQL'}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate('rag')}
            disabled={creating !== null}
            className={adminBtnGhost}
          >
            <Database className="w-3.5 h-3.5" />
            {creating === 'rag' ? 'Создание…' : 'RAG'}
          </button>
          <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </>
      }
    >
      {error && <AdminError message={error} />}
      {loading && backups.length === 0 && <AdminLoading />}

      <AdminCard>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3 font-medium">Тип</th>
                <th className="pb-2 pr-3 font-medium">Статус</th>
                <th className="pb-2 pr-3 font-medium">Размер</th>
                <th className="pb-2 pr-3 font-medium">Создан</th>
                <th className="pb-2 font-medium">Скачать</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{backup.type}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill variant={backupStatus(backup.status)} dot>
                      {backup.status ?? '—'}
                    </StatusPill>
                  </td>
                  <td className="py-2.5 pr-3">{formatSize(backup.size)}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatAdminDate(backup.createdAt)}
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => void handleDownload(backup)}
                      className="p-1.5 rounded-xl hover:bg-accent/70 text-muted-foreground hover:text-foreground"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {backups.length === 0 && !loading && (
            <EmptyState message="Бэкапы не найдены" className="py-6" />
          )}
        </div>
      </AdminCard>
    </AdminWorkspace>
  );
};

export default AdminBackupsPage;
