import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, RefreshCw, RotateCcw, Trash2, CheckSquare, Square, Eye } from 'lucide-react';
import { confirmDialog } from '../services/dialogService';
import userFilesService, {
  isUserFileActive,
  userFileStatusLabel,
} from '../services/userFilesService';
import { notifyRagLibraryChanged, subscribeRagLibraryChanged } from '../services/ragLibrarySync';
import type { UserFile } from '../types';
import { InlineError } from './ui/alert-banner';
import { IconButton } from './ui/icon-button';
import { EmptyState, LoadingState } from './ui/page-states';

interface UserFilesPanelProps {
  selectedSources: string[];
  onSelectionChange: (sources: string[]) => void;
  onReady?: (file: UserFile) => void;
  compact?: boolean;
  active?: boolean;
}

const UserFilesPanel: React.FC<UserFilesPanelProps> = ({
  selectedSources,
  onSelectionChange,
  onReady,
  compact = false,
  active = true,
}) => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [markdownPreview, setMarkdownPreview] = useState<{ name: string; text: string } | null>(null);
  const readyNotified = useRef(new Set<string>());
  const seededReady = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await userFilesService.list();
      setFiles(res.files);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить репозиторий PDF');
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

  const hasActive = files.some((file) => isUserFileActive(file.status));

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => {
      void load(true);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActive, load]);

  useEffect(() => {
    if (!seededReady.current) {
      if (loading) return;
      seededReady.current = true;
      for (const file of files) {
        if (file.status === 'ready') readyNotified.current.add(file.id);
      }
      return;
    }
    for (const file of files) {
      if (file.status === 'ready' && file.ragSource && !readyNotified.current.has(file.id)) {
        readyNotified.current.add(file.id);
        onReady?.(file);
      }
    }
  }, [files, loading, onReady]);

  const toggleSource = (ragSource: string) => {
    if (selectedSources.includes(ragSource)) {
      onSelectionChange(selectedSources.filter((source) => source !== ragSource));
    } else {
      onSelectionChange([...selectedSources, ragSource]);
    }
  };

  const handleRetry = async (fileId: string) => {
    setActionId(fileId);
    try {
      await userFilesService.retry(fileId);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось повторить обработку');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (file: UserFile) => {
    const confirmed = await confirmDialog({
      title: 'Удалить PDF?',
      description: `Удалить «${file.originalName}» и связанные чанки RAG?`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    setActionId(file.id);
    try {
      await userFilesService.remove(file.id);
      if (file.ragSource) {
        onSelectionChange(selectedSources.filter((source) => source !== file.ragSource));
      }
      notifyRagLibraryChanged();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setActionId(null);
    }
  };

  const handleMarkdown = async (file: UserFile) => {
    setActionId(file.id);
    try {
      const text = await userFilesService.getMarkdown(file.id);
      setMarkdownPreview({ name: file.originalName, text });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть Markdown');
    } finally {
      setActionId(null);
    }
  };

  const handleDownload = async (file: UserFile) => {
    setActionId(file.id);
    try {
      await userFilesService.downloadOriginal(file.id, file.originalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка скачивания PDF');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-3 mb-4 pb-4 border-b border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-blue-500" />
          PDF (OCR) ({files.length})
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-1.5 rounded hover:bg-accent/70"
          title="Обновить"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Сканы PDF: OCR → Markdown → индекс. Не через обычную загрузку документов.
      </p>

      {error && <InlineError message={error} className="text-xs" onDismiss={() => setError(null)} />}

      {loading && files.length === 0 && (
        <LoadingState message="Загрузка репозитория..." className="py-4" />
      )}

      {!loading && files.length === 0 && (
        <EmptyState
          message="Нет PDF. Загрузите файл через «Загрузить» — PDF уйдёт в OCR."
          className="py-4 text-sm"
        />
      )}

      <div className={compact ? 'space-y-2' : 'space-y-2 max-h-56 overflow-y-auto'}>
        {files.map((file) => {
          const selected = Boolean(file.ragSource && selectedSources.includes(file.ragSource));
          const busy = actionId === file.id;
          const ready = file.status === 'ready' && Boolean(file.ragSource);

          return (
            <div
              key={file.id}
              className={`rounded-lg border p-3 ${
                selected
                  ? 'border-primary/50 bg-primary/10 dark:bg-primary/15'
                  : 'border-border surface-elevated'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => ready && file.ragSource && toggleSource(file.ragSource)}
                  className="mt-0.5 shrink-0 text-blue-600 disabled:opacity-30"
                  title={ready ? 'Использовать в запросе' : 'Дождитесь статуса «Готов»'}
                >
                  {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
                    <span
                      className={
                        file.status === 'ready'
                          ? 'text-green-500'
                          : file.status === 'error'
                            ? 'text-red-500'
                            : 'text-amber-500'
                      }
                    >
                      {userFileStatusLabel(file.status)}
                    </span>
                    {file.pageCount != null && <span>{file.pageCount} стр.</span>}
                    {file.ragSource && <span className="truncate max-w-[140px]">{file.ragSource}</span>}
                  </div>
                  {file.statusMessage && (
                    <p className="text-[11px] text-muted-foreground mt-1">{file.statusMessage}</p>
                  )}
                  {file.error && <p className="text-[11px] text-red-500 mt-1">{file.error}</p>}
                  {isUserFileActive(file.status) && (
                    <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(file.progress || 8, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {file.status === 'ready' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleMarkdown(file)}
                      className="p-1.5 rounded hover:bg-accent/70 disabled:opacity-40"
                      title="Показать Markdown"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDownload(file)}
                    className="p-1.5 rounded hover:bg-accent/70 disabled:opacity-40"
                    title="Скачать исходный PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {file.status === 'error' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRetry(file.id)}
                      className="p-1.5 rounded hover:bg-accent/70 disabled:opacity-40"
                      title="Повторить OCR"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <IconButton
                    variant="danger"
                    size="sm"
                    label="Удалить PDF"
                    disabled={busy}
                    onClick={() => void handleDelete(file)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {markdownPreview && (
        <div className="rounded-lg border border-border p-3 max-h-56 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium">Markdown: {markdownPreview.name}</p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setMarkdownPreview(null)}
            >
              Закрыть
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">
            {markdownPreview.text.slice(0, 8000)}
            {markdownPreview.text.length > 8000 ? '…' : ''}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UserFilesPanel;
