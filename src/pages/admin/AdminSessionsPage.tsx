import React, { useCallback, useEffect, useState } from 'react';
import { Download, Pencil, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminSessionRow, ChatMessage, UserRole } from '../../types';
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminWorkspace,
  adminBtnGhost,
  adminBtnPrimary,
  adminInput,
} from './adminUi';
import { formatAdminDate, getErrorMessage } from './adminUtils';
import { confirmDialog, promptDialog } from '../../services/dialogService';
import { showSuccessToast } from '../../services/toastService';
import { SelectMenu } from '../../components/ui/select-menu';
import { EmptyState } from '../../components/ui/page-states';
import { IconButton } from '../../components/ui/icon-button';
import { cn } from '../../lib/utils';
import { roleLabel, USER_ROLES } from '../../utils/auth';

const ROLE_FILTERS = [
  { value: '', label: 'Все роли' },
  ...USER_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
];

const AdminSessionsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<(AdminSessionRow & { history?: ChatMessage[] }) | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listAllSessions({
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        role: (role || undefined) as UserRole | undefined,
      });
      setRows(res.sessions);
      setTotal(res.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRow = async (row: AdminSessionRow) => {
    try {
      const res = await adminService.getSessionRow(row.rowId);
      setSelected({
        ...row,
        ...(res.session ?? {}),
        history: res.history ?? [],
        rowId: row.rowId,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    const owner = await promptDialog({
      title: 'Создать RAG-сессию',
      description: 'UUID или email владельца',
      placeholder: 'user@example.com',
      confirmLabel: 'Далее',
    });
    if (!owner?.trim()) return;
    const title = await promptDialog({
      title: 'Название сессии',
      defaultValue: 'Новая сессия',
      placeholder: 'Договоры',
      confirmLabel: 'Создать',
    });
    if (title === null) return;
    try {
      await adminService.createSession({
        userId: owner.trim(),
        title: title.trim() || undefined,
      });
      showSuccessToast('Сессия создана');
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRename = async (row: AdminSessionRow) => {
    const title = await promptDialog({
      title: 'Переименовать сессию',
      defaultValue: row.title || '',
      placeholder: 'Пусто — сбросить на авто-имя',
      confirmLabel: 'Сохранить',
    });
    if (title === null) return;
    try {
      await adminService.patchSessionRow(row.rowId, { title: title.trim() });
      showSuccessToast(title.trim() ? 'Название обновлено' : 'Название сброшено');
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (row: AdminSessionRow) => {
    const confirmed = await confirmDialog({
      title: 'Удалить RAG-сессию?',
      description: `${row.title || row.sessionId} · ${row.email ?? row.userId}`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    try {
      await adminService.deleteSessionRow(row.rowId);
      if (selected?.rowId === row.rowId) setSelected(null);
      showSuccessToast('Сессия удалена');
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleReassign = async (row: AdminSessionRow) => {
    const nextOwner = await promptDialog({
      title: 'Сменить владельца',
      description: 'UUID или email нового владельца',
      placeholder: 'user@example.com',
      confirmLabel: 'Передать',
    });
    if (!nextOwner) return;
    try {
      await adminService.reassignSessionRow(row.rowId, nextOwner.trim());
      showSuccessToast('Владелец обновлён');
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleBackup = async () => {
    try {
      await adminService.backupSessions({
        role: (role || undefined) as UserRole | undefined,
        search: debouncedSearch || undefined,
      });
      showSuccessToast('Бэкап RAG-сессий создан');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRestore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
      const res = await adminService.restoreSessions(parsed);
      showSuccessToast(`Восстановлено: ${res.restored ?? 0}, пропущено: ${res.skipped ?? 0}`);
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const history = selected?.history ?? [];

  return (
    <AdminWorkspace
      title="RAG-сессии"
      description={`${total} сессий`}
      actions={
        <>
          <SelectMenu
            aria-label="Фильтр по роли"
            className="w-40"
            value={role}
            onChange={(value) => {
              setPage(1);
              setRole(value);
            }}
            options={ROLE_FILTERS}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Поиск…"
            className={cn(adminInput, 'sm:w-44')}
          />
          <button type="button" onClick={() => void handleCreate()} className={adminBtnPrimary}>
            <Plus className="w-3.5 h-3.5" />
            Создать
          </button>
          <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => void handleBackup()} className={adminBtnGhost}>
            Бэкап
          </button>
          <label className={cn(adminBtnGhost, 'cursor-pointer')}>
            Restore
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(e) => void handleRestore(e.target.files?.[0])}
            />
          </label>
        </>
      }
    >
      {error && <AdminError message={error} />}
      {loading && rows.length === 0 && <AdminLoading />}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <AdminCard>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3 font-medium">Владелец</th>
                  <th className="pb-2 pr-3 font-medium">Сессия</th>
                  <th className="pb-2 pr-3 font-medium">Записи</th>
                  <th className="pb-2 pr-3 font-medium hidden md:table-cell">Обновлена</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowId} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <button type="button" className="text-left" onClick={() => void openRow(row)}>
                        <span className="block text-xs font-medium truncate max-w-[12rem]">
                          {row.email || row.userId}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {roleLabel(row.role)}
                        </span>
                      </button>
                    </td>
                    <td className="py-2 pr-3 max-w-[14rem] truncate">
                      <button type="button" className="text-left truncate w-full" onClick={() => void openRow(row)}>
                        {row.title || row.sessionId}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{row.messageCount ?? '—'}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {formatAdminDate(row.updatedAt)}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-0.5">
                        <IconButton
                          label="Скачать"
                          onClick={() => void adminService.downloadSessionRow(row.rowId, `${row.sessionId}.json`)}
                        >
                          <Download className="w-4 h-4" />
                        </IconButton>
                        <IconButton label="Переименовать" onClick={() => void handleRename(row)}>
                          <Pencil className="w-4 h-4" />
                        </IconButton>
                        <IconButton label="Владелец" onClick={() => void handleReassign(row)}>
                          <UserRound className="w-4 h-4" />
                        </IconButton>
                        <IconButton variant="danger" label="Удалить" onClick={() => void handleDelete(row)}>
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && !loading && <EmptyState message="Сессии не найдены" className="py-6" />}
          </div>
          {total > 50 && (
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className={adminBtnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </button>
              <button
                type="button"
                className={adminBtnPrimary}
                disabled={page * 50 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Дальше
              </button>
            </div>
          )}
        </AdminCard>

        <AdminCard title={selected ? selected.title || selected.sessionId : 'Просмотр'}>
          {!selected && <p className="text-xs text-muted-foreground">Выберите сессию в таблице.</p>}
          {selected && (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto scroll-clip">
              <p className="text-xs text-muted-foreground">
                {selected.email || selected.userId} · {selected.sessionId}
              </p>
              {history.length === 0 && <p className="text-xs text-muted-foreground">Нет истории</p>}
              {history.map((message, index) => (
                <div key={`${index}-${message.role}`} className="rounded-xl border border-border/60 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">{message.role}</p>
                  <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminWorkspace>
  );
};

export default AdminSessionsPage;
