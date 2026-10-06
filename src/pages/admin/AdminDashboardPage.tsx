import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, FileDown } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminDashboardData } from '../../types';
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminWorkspace,
  adminBtnGhost,
  adminBtnPrimary,
} from './adminUi';
import { formatAdminDate, getErrorMessage } from './adminUtils';
import { MetricCard } from '../../components/ui/metric-card';

function formatSystemValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const AdminDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await adminService.getDashboard());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    try {
      await adminService.exportReport('pdf');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const systemEntries = dashboard?.system
    ? Object.entries(dashboard.system).filter(([, value]) => value != null && typeof value !== 'object')
    : [];
  const metricCards: { label: string; value: number }[] = [];
  if (dashboard) {
    const known: [string, number | undefined][] = [
      ['Пользователи', dashboard.users?.total],
      ['Админы', dashboard.users?.admins],
      ['Подтверждён email', dashboard.users?.verified],
      ['Чаты', dashboard.chats?.total],
      ['RAG-сессии', dashboard.rag?.sessions],
      ['RAG-документы', dashboard.rag?.documents],
    ];
    for (const [label, value] of known) {
      if (typeof value === 'number') metricCards.push({ label, value });
    }
    for (const item of dashboard.extraMetrics ?? []) metricCards.push(item);
  }
  const hasDashboardBody = Boolean(
    metricCards.length
    || (dashboard?.recentActivity && dashboard.recentActivity.length > 0)
    || systemEntries.length > 0,
  );

  return (
    <AdminWorkspace
      title="Обзор"
      description="Пользователи, чаты и система"
      actions={
        <>
          <button type="button" onClick={() => void load()} className={adminBtnGhost}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button type="button" onClick={() => void handleExport()} className={adminBtnPrimary}>
            <FileDown className="w-3.5 h-3.5" />
            PDF-отчёт
          </button>
        </>
      }
    >
      {error && <AdminError message={error} />}
      {loading && !dashboard && <AdminLoading />}

      {dashboard && !hasDashboardBody && !loading && (
        <AdminCard title="Сводка">
          <p className="text-sm text-muted-foreground">
            Сервер ответил, но чисел для карточек в сводке нет.
          </p>
        </AdminCard>
      )}

      {dashboard && hasDashboardBody && (
        <div className="space-y-4 min-w-0">
          {metricCards.length > 0 && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {metricCards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
          )}

          {dashboard.recentActivity && dashboard.recentActivity.length > 0 && (
            <AdminCard title="Последние события">
              <div className="space-y-1">
                {dashboard.recentActivity.slice(0, 12).map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between gap-3 text-sm py-2 border-b border-border/60 last:border-0 min-w-0"
                  >
                    <span className="min-w-0 break-words">{event.action}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatAdminDate(event.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {systemEntries.length > 0 && (
            <AdminCard title="Система">
              <div className="space-y-1">
                {systemEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-3 text-sm py-1.5 border-b border-border/60 last:border-0 min-w-0"
                  >
                    <span className="text-muted-foreground truncate">{key}</span>
                    <span className="font-mono text-xs text-right break-all">{formatSystemValue(value)}</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminDashboardPage;
