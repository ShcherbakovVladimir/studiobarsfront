import React, { useState } from 'react';
import type { InferenceRequestRecord, InferenceResponseStatus } from '../../types';
import { EmptyState, LoadingState } from '../ui/page-states';
import { StatusPill } from '../ui/status-pill';
import { SelectMenu } from '../ui/select-menu';
import { DatePicker } from '../ui/date-picker';
import { fieldInputClass } from '../ui/menu-popover';
import { confirmDialog } from '../../services/dialogService';
import { formatDateTime, formatMs, statusLabel } from './format';
import { cn } from '../../lib/utils';

interface InferenceHistoryPanelProps {
  items: InferenceRequestRecord[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    status?: string;
    mode?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => void;
}

const InferenceHistoryPanel: React.FC<InferenceHistoryPanelProps> = ({
  items,
  total,
  page,
  limit,
  loading,
  error,
  selectedId,
  onSelect,
  onDelete,
  onPageChange,
  onFilterChange,
}) => {
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const pages = Math.max(1, Math.ceil(total / limit));

  const applyFilters = (next?: {
    status?: string;
    mode?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => {
    const nextStatus = next?.status ?? status;
    const nextMode = next?.mode ?? mode;
    const nextSearch = next?.search ?? search;
    const nextFrom = next?.from ?? from;
    const nextTo = next?.to ?? to;
    onFilterChange({
      status: nextStatus || undefined,
      mode: nextMode || undefined,
      search: nextSearch.trim() || undefined,
      from: nextFrom || undefined,
      to: nextTo || undefined,
    });
  };

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    ...(['completed', 'error', 'cancelled', 'streaming', 'pending'] as InferenceResponseStatus[]).map(
      (item) => ({ value: item, label: statusLabel(item) })
    ),
  ];

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <SelectMenu
          value={status}
          onChange={(value) => {
            setStatus(value);
            applyFilters({ status: value });
          }}
          options={statusOptions}
          aria-label="Статус"
          className="w-[9.5rem]"
        />
        <SelectMenu
          value={mode}
          onChange={(value) => {
            setMode(value);
            applyFilters({ mode: value });
          }}
          options={[
            { value: '', label: 'Все режимы' },
            { value: 'completion', label: 'completion' },
            { value: 'chat', label: 'chat' },
          ]}
          aria-label="Режим"
          className="w-[9rem]"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по промпту"
          className={cn(fieldInputClass, 'min-w-[12rem] flex-1')}
        />
        <DatePicker
          value={from}
          onChange={(value) => {
            setFrom(value);
            applyFilters({ from: value });
          }}
          placeholder="С даты"
          className="w-[9.5rem]"
        />
        <DatePicker
          value={to}
          onChange={(value) => {
            setTo(value);
            applyFilters({ to: value });
          }}
          placeholder="По дату"
          className="w-[9.5rem]"
        />
        <button type="submit" className="h-8 px-3 rounded-xl text-xs hover:bg-accent">
          Найти
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && items.length === 0 && <LoadingState message="Загрузка истории…" />}
      {!loading && items.length === 0 && <EmptyState message="Прогонов пока нет." />}

      <div className="space-y-2">
        {items.map((item) => {
          const status = item.response?.status;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-3 ${
                selectedId === item.id ? 'border-primary/60 bg-accent/40' : 'border-border'
              }`}
            >
              <button type="button" className="w-full text-left" onClick={() => onSelect(item.id)}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <StatusPill variant={statusVariantSafe(status)}>{statusLabel(status)}</StatusPill>
                  <span className="text-[11px] font-mono text-muted-foreground">{item.mode}</span>
                  {item.stream && <span className="text-[11px] text-muted-foreground">stream</span>}
                  <span className="text-[11px] text-muted-foreground ml-auto">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="text-sm line-clamp-2">{item.prompt || '—'}</p>
                <p className="text-xs text-muted-foreground font-mono line-clamp-2 mt-1">
                  {item.preview || item.response?.text || 'нет ответа'}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-2">
                  <span>{item.model || 'модель ?'}</span>
                  <span>latency {formatMs(item.response?.latencyMs)}</span>
                  <span>ttft {formatMs(item.response?.ttftMs)}</span>
                </div>
              </button>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  className="h-7 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    void (async () => {
                      const ok = await confirmDialog({
                        title: 'Удалить прогон?',
                        description: 'Будет удалён запрос и связанный ответ.',
                        destructive: true,
                        confirmLabel: 'Удалить',
                      });
                      if (ok) onDelete(item.id);
                    })();
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total} записей · стр. {page}/{pages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-7 px-2 rounded-lg hover:bg-accent disabled:opacity-40"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="h-7 px-2 rounded-lg hover:bg-accent disabled:opacity-40"
            >
              Дальше
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function statusVariantSafe(status?: string) {
  if (status === 'completed') return 'success' as const;
  if (status === 'error') return 'error' as const;
  if (status === 'cancelled') return 'warning' as const;
  if (status === 'streaming' || status === 'pending') return 'info' as const;
  return 'neutral' as const;
}

export default InferenceHistoryPanel;
