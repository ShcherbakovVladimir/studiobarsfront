import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw, Play } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminMaintenanceSettings, AdminReindexStatus } from '../../types';
import {
  AdminCard,
  AdminCheck,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSuccess,
  AdminWorkspace,
  adminBtnGhost,
  adminBtnPrimary,
  adminTextarea,
} from './adminUi';
import { getErrorMessage } from './adminUtils';
import { confirmDialog } from '../../services/dialogService';
import { StatusPill } from '../../components/ui/status-pill';

function isReindexActive(status?: string): boolean {
  const value = (status ?? '').toLowerCase();
  return ['running', 'in_progress', 'started', 'pending', 'queued'].includes(value);
}

function reindexPill(status?: string): 'success' | 'info' | 'error' | 'neutral' | 'warning' {
  const value = (status ?? '').toLowerCase();
  if (['done', 'completed', 'success'].includes(value)) return 'success';
  if (isReindexActive(status)) return 'info';
  if (['error', 'failed'].includes(value)) return 'error';
  if (['idle', 'ready'].includes(value)) return 'neutral';
  return 'warning';
}

const AdminMaintenancePage: React.FC = () => {
  const [maintenance, setMaintenance] = useState<AdminMaintenanceSettings | null>(null);
  const [reindex, setReindex] = useState<AdminReindexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [maintRes, reindexRes] = await Promise.all([
        adminService.getMaintenance(),
        adminService.getReindexStatus(),
      ]);
      setMaintenance(maintRes.maintenance);
      setReindex(reindexRes.reindex);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isReindexActive(reindex?.status)) return;
    const timer = window.setInterval(() => {
      void adminService
        .getReindexStatus()
        .then((res) => setReindex(res.reindex))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [reindex?.status]);

  const handleSave = async () => {
    if (!maintenance) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminService.updateMaintenance(maintenance);
      setMaintenance(res.maintenance);
      setSuccess('Режим техработ обновлён');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    const confirmed = await confirmDialog({
      title: 'Переиндексация RAG',
      description: 'Запустить переиндексацию RAG?',
      confirmLabel: 'Запустить',
    });
    if (!confirmed) return;
    try {
      const res = await adminService.startReindex();
      setReindex(res.reindex);
      setSuccess('Переиндексация запущена');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading && !maintenance) {
    return (
      <AdminWorkspace title="Техработы" description="Maintenance и RAG">
        <AdminLoading />
      </AdminWorkspace>
    );
  }

  return (
    <AdminWorkspace
      title="Техработы"
      description="Режим обслуживания и переиндексация RAG"
      actions={
        <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {error && <AdminError message={error} />}
      {success && <AdminSuccess message={success} />}

      {maintenance && (
        <div className="space-y-3 min-w-0">
          <AdminCard title="Режим техработ">
            <div className="space-y-3">
              <AdminCheck
                id="admin-maintenance-enabled"
                name="maintenanceEnabled"
                checked={maintenance.enabled}
                onChange={(checked) => setMaintenance({ ...maintenance, enabled: checked })}
              >
                Включить режим техработ (503 для обычных пользователей)
              </AdminCheck>

              <AdminCheck
                id="admin-maintenance-allow-admin"
                name="allowAdminAccess"
                checked={maintenance.allowAdminAccess ?? true}
                onChange={(checked) =>
                  setMaintenance({ ...maintenance, allowAdminAccess: checked })
                }
              >
                Разрешить доступ админам
              </AdminCheck>

              <AdminField label="Сообщение для пользователей" htmlFor="admin-maintenance-message">
                <textarea
                  id="admin-maintenance-message"
                  name="maintenanceMessage"
                  value={maintenance.message ?? ''}
                  onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                  rows={3}
                  className={adminTextarea}
                />
              </AdminField>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className={adminBtnPrimary}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </AdminCard>

          <AdminCard title="Переиндексация RAG">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0 text-sm text-muted-foreground">
                <StatusPill variant={reindexPill(reindex?.status)} dot={isReindexActive(reindex?.status)}>
                  {reindex?.status ?? 'нет данных'}
                </StatusPill>
                {reindex?.progress != null && <span>{reindex.progress}%</span>}
                {reindex?.message && (
                  <span className="break-words min-w-0">{reindex.message}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleReindex()}
                disabled={isReindexActive(reindex?.status)}
                className={adminBtnGhost}
              >
                <Play className="w-3.5 h-3.5" />
                Запустить
              </button>
            </div>
            {isReindexActive(reindex?.status) && reindex?.progress != null && (
              <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/40 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, reindex.progress))}%` }}
                />
              </div>
            )}
          </AdminCard>
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminMaintenancePage;
