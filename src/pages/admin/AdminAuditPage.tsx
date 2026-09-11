import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminAuditEvent } from '../../types';
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminWorkspace,
  adminBtnGhost,
} from './adminUi';
import { formatAdminDate, getErrorMessage } from './adminUtils';
import { EmptyState } from '../../components/ui/page-states';

const AdminAuditPage: React.FC = () => {
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listAuditEvents({ limit, offset });
      setEvents(res.events);
      setTotal(res.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const from = total === 0 ? 0 : offset + 1;
  const to = offset + events.length;

  return (
    <AdminWorkspace
      title="Аудит"
      description={`${total} событий`}
      actions={
        <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {error && <AdminError message={error} />}
      {loading && events.length === 0 && <AdminLoading />}

      <AdminCard>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3 font-medium">Время</th>
                <th className="pb-2 pr-3 font-medium">Действие</th>
                <th className="pb-2 pr-3 font-medium">Актор</th>
                <th className="pb-2 font-medium">Цель</th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((event) => (
                <tr key={event.id} className="border-b border-border/60 last:border-0 align-top">
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatAdminDate(event.createdAt)}
                  </td>
                  <td className="py-2.5 pr-3 font-medium break-words min-w-0">{event.action}</td>
                  <td className="py-2.5 pr-3 text-xs max-w-[12rem] truncate">
                    {event.actorEmail ?? event.actorId ?? '—'}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground break-all max-w-[16rem]">
                    {event.targetType && event.targetId
                      ? `${event.targetType}:${event.targetId}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && !loading && (
            <EmptyState message="События не найдены" className="py-6" />
          )}
        </div>

        <div className="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-border min-w-0">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className={adminBtnGhost}
          >
            Назад
          </button>
          <span className="text-xs text-muted-foreground truncate">
            {from}–{to} из {total}
          </span>
          <button
            type="button"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
            className={adminBtnGhost}
          >
            Вперёд
          </button>
        </div>
      </AdminCard>
    </AdminWorkspace>
  );
};

export default AdminAuditPage;
