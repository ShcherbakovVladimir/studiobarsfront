import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckSquare, ChevronDown, ChevronRight, FolderOpen, Loader2, RefreshCw, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import { isRoleScopeDenial } from '../services/apiClient';
import workspaceService, { isRecognitionPending, type WorkspaceEntry } from '../services/workspaceService';
import { recognitionLabel } from './workspace/workspaceModel';
import type { RagDocument } from '../types';

const POLL_MS = 5000;

interface WorkspaceSourcesSectionProps {
  selectedSources: string[];
  onToggle: (source: string) => void;
  onSelectMany: (sources: string[]) => void;
  /** Строки `GET /api/rag/documents` с источником `workspace/…`: статус эмбеддингов. */
  indexBySource: Map<string, RagDocument>;
  indexLoaded: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  highlightSource?: string | null;
}

type RowState =
  | { kind: 'pending'; label: string }
  | { kind: 'error'; label: string }
  | { kind: 'missing'; label: string }
  | { kind: 'indexing'; label: string; percent: number }
  | { kind: 'ready'; label: string };

function rowState(entry: WorkspaceEntry, doc: RagDocument | undefined, indexLoaded: boolean): RowState {
  const recognition = entry.recognition!;
  if (recognition.status === 'error') return { kind: 'error', label: recognitionLabel(recognition) ?? 'Ошибка' };
  if (isRecognitionPending(recognition)) return { kind: 'pending', label: recognitionLabel(recognition) ?? 'Распознаётся' };
  if (!doc) {
    return indexLoaded
      ? { kind: 'missing', label: 'Нет в поиске — снят из индекса' }
      : { kind: 'ready', label: 'В поиске' };
  }
  if (!doc.is_fully_indexed) {
    const percent = Math.round(doc.completion_percentage ?? 0);
    return { kind: 'indexing', label: `Индексация ${percent}%`, percent };
  }
  return { kind: 'ready', label: 'Готов' };
}

/**
 * Файлы рабочей папки как документы для вопроса. Список — из `GET /api/workspace`:
 * `GET /api/rag/documents` не знает про дерево и файлы в очереди распознавания.
 * В запрос уходит `recognition.ragSource` (`workspace/docs/scan.md` для `docs/scan.pdf`).
 */
export function WorkspaceSourcesSection({
  selectedSources,
  onToggle,
  onSelectMany,
  indexBySource,
  indexLoaded,
  open,
  onOpenChange,
  active,
  highlightSource,
}: WorkspaceSourcesSectionProps) {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const listing = await workspaceService.list();
      setEntries(listing.entries);
      setError(null);
    } catch (err) {
      if (!silent && !isRoleScopeDenial(err)) {
        setError(err instanceof Error ? err.message : 'Не удалось получить рабочую папку');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const searchable = useMemo(
    () => entries.filter((entry) => entry.type === 'file' && entry.recognition?.ragSource),
    [entries]
  );
  const skipped = entries.filter((entry) => entry.type === 'file').length - searchable.length;
  const pending = searchable.some((entry) => isRecognitionPending(entry.recognition));

  useEffect(() => {
    if (!active || !pending) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, pending, load]);

  const rows = searchable.map((entry) => {
    const source = entry.recognition!.ragSource!;
    return { entry, source, state: rowState(entry, indexBySource.get(source), indexLoaded) };
  });
  const selectable = rows.filter((row) => row.state.kind === 'ready' || row.state.kind === 'indexing');
  const selectedHere = rows.filter((row) => selectedSources.includes(row.source)).length;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-sm font-medium hover:bg-accent/70"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <FolderOpen className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <span className="truncate">
            Рабочая папка ({searchable.length}){selectedHere > 0 ? ` · выбрано ${selectedHere}` : ''}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {open && selectable.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectMany(selectable.map((row) => row.source))}
              className="rounded px-2 py-1 text-xs hover:bg-accent/70"
            >
              Все
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded p-1.5 hover:bg-accent/70"
            title="Обновить рабочую папку"
            aria-label="Обновить рабочую папку"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-1.5">
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          {!error && searchable.length === 0 && !loading && (
            <p className="px-1 py-2 text-xs leading-relaxed text-muted-foreground">
              В папке нет документов для поиска.{' '}
              <Link to="/workspace" className="text-primary underline-offset-2 hover:underline">
                Загрузите их в Рабочую папку
              </Link>{' '}
              — после распознавания они появятся здесь.
            </p>
          )}

          <ul className="space-y-1">
            {rows.map(({ entry, source, state }) => {
              const selected = selectedSources.includes(source);
              const disabled = state.kind === 'pending' || state.kind === 'error' || state.kind === 'missing';
              return (
                <li key={entry.path}>
                  <button
                    type="button"
                    disabled={disabled && !selected}
                    onClick={() => onToggle(source)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed',
                      highlightSource === source
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : selected
                          ? 'border-primary/50 bg-primary/10 dark:bg-primary/15'
                          : 'border-transparent hover:bg-accent disabled:hover:bg-transparent'
                    )}
                    title={disabled ? state.label : `${entry.path} → ${source}`}
                  >
                    <span className="mt-0.5 shrink-0 text-blue-600">
                      {state.kind === 'pending' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      ) : state.kind === 'error' || state.kind === 'missing' ? (
                        <AlertCircle className={cn('h-4 w-4', state.kind === 'error' ? 'text-destructive' : 'text-amber-500')} />
                      ) : selected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-medium', disabled && 'opacity-60')}>{entry.path}</span>
                      <span
                        className={cn(
                          'mt-0.5 block text-[11px]',
                          state.kind === 'ready' && 'text-green-600 dark:text-green-400',
                          (state.kind === 'indexing' || state.kind === 'pending' || state.kind === 'missing') &&
                            'text-amber-600 dark:text-amber-400',
                          state.kind === 'error' && 'text-destructive'
                        )}
                      >
                        {state.label}
                      </span>
                      {state.kind === 'indexing' && (
                        <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-border">
                          <span className="block h-full bg-blue-500" style={{ width: `${state.percent}%` }} />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {(skipped > 0 || searchable.length > 0) && (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
              {skipped > 0 && `Ещё ${skipped} файл(ов) не распознаются и в поиск не попадают. `}
              Загружать, править и удалять — в{' '}
              <Link to="/workspace" className="text-primary underline-offset-2 hover:underline">
                Рабочей папке
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
