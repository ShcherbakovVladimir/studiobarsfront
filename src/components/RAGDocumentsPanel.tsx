import React, { useCallback, useEffect, useState } from 'react';
import { confirmDialog } from '../services/dialogService';
import {
  Download,
  FileText,
  RefreshCw,
  RotateCcw,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import ragService from '../services/ragService';
import { notifyRagLibraryChanged, subscribeRagLibraryChanged } from '../services/ragLibrarySync';
import type { RagDocument } from '../types';
import UserFilesPanel from './UserFilesPanel';
import { InlineError } from './ui/alert-banner';
import { IconButton } from './ui/icon-button';
import { EmptyState, LoadingState } from './ui/page-states';

interface RAGDocumentsPanelProps {
  isDarkMode: boolean;
  selectedSources: string[];
  onSelectionChange: (sources: string[]) => void;
  onDocumentsChange?: () => void;
  compact?: boolean;
  pollIndexing?: boolean;
  highlightSource?: string | null;
  active?: boolean;
}

function statusLabel(doc: RagDocument): string {
  if (doc.indexing_in_progress) return 'Индексация...';
  if (doc.is_fully_indexed) return 'Готов';
  if (doc.embedding_status) return String(doc.embedding_status);
  return '—';
}

function statusColor(doc: RagDocument): string {
  if (doc.indexing_in_progress) return 'text-amber-500';
  if (doc.is_fully_indexed) return 'text-green-500';
  if ((doc.completion_percentage ?? 0) < 100) return 'text-amber-500';
  return 'text-muted-foreground';
}

const RAGDocumentsPanel: React.FC<RAGDocumentsPanelProps> = ({
  isDarkMode,
  selectedSources,
  onSelectionChange,
  onDocumentsChange,
  compact = false,
  pollIndexing = true,
  highlightSource = null,
  active = true,
}) => {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<string | null>(null);
  const [previewChunks, setPreviewChunks] = useState<unknown[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await ragService.getDocuments();
      setDocuments(res.documents);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить документы');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => subscribeRagLibraryChanged(() => {
    void load(true);
  }), [load]);

  const indexingInProgress = documents.some(
    (doc) => doc.indexing_in_progress || (doc.completion_percentage ?? 0) < 100
  );

  useEffect(() => {
    if (!pollIndexing || !indexingInProgress) return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [pollIndexing, indexingInProgress, load]);

  const toggleSource = (source: string) => {
    const doc = documents.find((d) => d.source === source);
    if (doc && !doc.is_fully_indexed && (doc.completion_percentage ?? 0) < 100) {
      setError(`«${source}» ещё индексируется. Поиск заработает после 100%.`);
    }
    if (selectedSources.includes(source)) {
      onSelectionChange(selectedSources.filter((s) => s !== source));
    } else {
      onSelectionChange([...selectedSources, source]);
    }
  };

  const selectAll = () => onSelectionChange(documents.map((d) => d.source));
  const clearSelection = () => onSelectionChange([]);

  const handleDelete = async (source: string) => {
    const confirmed = await confirmDialog({
      title: 'Удалить документ?',
      description: `Удалить документ «${source}» из индекса?`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    setActionId(source);
    try {
      await ragService.deleteDocument(source);
      onSelectionChange(selectedSources.filter((s) => s !== source));
      await load();
      onDocumentsChange?.();
      notifyRagLibraryChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setActionId(null);
    }
  };

  const handlePreview = async (source: string) => {
    setActionId(source);
    try {
      const res = await ragService.getDocument(source);
      setPreviewSource(source);
      setPreviewChunks(res.chunks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить превью');
    } finally {
      setActionId(null);
    }
  };

  const handleReindex = async (source: string) => {
    setActionId(source);
    try {
      await ragService.reindexDocument(source, false);
      await load();
      onDocumentsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка переиндексации');
    } finally {
      setActionId(null);
    }
  };

  const handleDownload = async (source: string) => {
    setActionId(source);
    try {
      await ragService.downloadDocument(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка скачивания');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className={compact ? '' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-blue-500" />
          Документы ({documents.length})
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs px-2 py-1 rounded hover:bg-accent/70"
          >
            Все
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs px-2 py-1 rounded hover:bg-accent/70"
          >
            Сброс
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="p-1.5 rounded hover:bg-accent/70"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {indexingInProgress && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          Индексация в процессе — поиск по неготовым документам может быть пустым.
        </p>
      )}

      {selectedSources.length > 0 && (
        <p className="text-xs text-primary mb-2">
          Выбрано для запроса: {selectedSources.length}
        </p>
      )}

      {error && <InlineError message={error} className="mb-2 text-xs" />}

      <UserFilesPanel
        selectedSources={selectedSources}
        onSelectionChange={onSelectionChange}
        compact={compact}
        active={active}
        onReady={() => {
          void load(true);
          onDocumentsChange?.();
        }}
      />

      {loading && documents.length === 0 && (
        <LoadingState message="Загрузка документов..." className="py-6" />
      )}

      {!loading && documents.length === 0 && (
        <EmptyState
          message="Нет загруженных документов. Загрузите файлы через кнопку «Загрузить»."
          className="py-6 text-sm"
        />
      )}

      <div className={compact ? 'space-y-2' : 'space-y-2 max-h-80 overflow-y-auto'}>
        {documents.map((doc) => {
          const selected = selectedSources.includes(doc.source);
          const busy = actionId === doc.source;
          const pct = doc.completion_percentage ?? (doc.is_fully_indexed ? 100 : 0);
          const highlighted = highlightSource === doc.source;

          return (
            <div
              key={doc.source}
              className={`rounded-lg border p-3 transition-colors ${
                highlighted
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : selected
                  ? 'border-primary/50 bg-primary/10 dark:bg-primary/15'
                  : 'border-transparent hover:bg-accent dark:hover:bg-card'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleSource(doc.source)}
                  className="mt-0.5 shrink-0 text-blue-600"
                  title={selected ? 'Убрать из запроса' : 'Использовать в запросе'}
                >
                  {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={doc.source}>
                    {doc.source}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
                    <span className={statusColor(doc)}>{statusLabel(doc)}</span>
                    {doc.chunks != null && <span>{doc.chunks} чанков</span>}
                    {doc.embedded_chunks != null && <span>{doc.embedded_chunks} эмб.</span>}
                    {pct > 0 && <span>{pct}%</span>}
                  </div>
                  {pct > 0 && pct < 100 && (
                    <div className="mt-2 h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePreview(doc.source)}
                    className="p-1.5 rounded hover:bg-accent dark:hover:bg-muted disabled:opacity-40 text-xs"
                    title="Превью чанков"
                  >
                    👁
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDownload(doc.source)}
                    className="p-1.5 rounded hover:bg-accent dark:hover:bg-muted disabled:opacity-40"
                    title="Скачать восстановленный текст (не исходный PDF)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReindex(doc.source)}
                    className="p-1.5 rounded hover:bg-accent dark:hover:bg-muted disabled:opacity-40"
                    title="Переиндексировать"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                  </button>
                  <IconButton
                    variant="danger"
                    size="sm"
                    label="Удалить"
                    disabled={busy}
                    onClick={() => void handleDelete(doc.source)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewSource && (
        <div className="mt-3 rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium">Чанки: {previewSource}</p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => {
                setPreviewSource(null);
                setPreviewChunks([]);
              }}
            >
              Закрыть
            </button>
          </div>
          <div className="space-y-2 text-[11px] text-muted-foreground">
            {previewChunks.slice(0, 5).map((chunk, index) => {
              const row = chunk as { content?: string; metadata?: unknown };
              return (
                <pre key={index} className="whitespace-pre-wrap surface-elevated p-2 rounded-lg text-sm">
                  {(row.content ?? '').slice(0, 400)}
                  {(row.content?.length ?? 0) > 400 ? '…' : ''}
                </pre>
              );
            })}
            {previewChunks.length === 0 && <p>Чанки не найдены</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGDocumentsPanel;
