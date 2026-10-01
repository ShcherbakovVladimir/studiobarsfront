import React, { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { BarChart3, Check, Copy, Download, Loader2, MessageSquarePlus, Pencil, Save, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { showErrorToast } from '../../services/toastService';
import { MenuPopover } from '../ui/menu-popover';
import { ChatMarkdown } from '../markdown/ChatMarkdown';
import workspaceService, {
  isRecognitionPending,
  matchWorkspaceImage,
  workspaceFileExtension,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from '../../services/workspaceService';
import { formatBytes, isEditablePath, recognitionLabel } from './workspaceModel';

interface WorkspaceFilePanelProps {
  path: string;
  /** Файлы папки: по ним ищем снимок, если в Markdown указано короткое или неточное имя. */
  files?: WorkspaceEntry[];
  entry?: WorkspaceEntry;
  file: WorkspaceFileContent | null;
  loading: boolean;
  error: string | null;
  isDarkMode: boolean;
  saving: boolean;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSave: (content: string) => Promise<boolean>;
  onMention: () => void;
  /** Открыть Аналитик с этим документом в `documentSources`. */
  onAsk?: (ragSource: string) => void;
}

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40';

function markdownHtml(source: string): string {
  const html = marked.parse(source, { async: false, gfm: true, breaks: true });
  return typeof html === 'string' ? html : '';
}

/** Текст без символов Markdown: заголовки, списки и таблицы остаются строками. */
function markdownPlain(source: string): string {
  const withBreaks = markdownHtml(source)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|table)>/gi, '\n');
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent ?? source;
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function writeClipboard(plain: string, html?: string): Promise<void> {
  if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(plain);
}

export function WorkspaceFilePanel({
  path,
  files = [],
  entry,
  file,
  loading,
  error,
  isDarkMode,
  saving,
  onClose,
  onDownload,
  onDelete,
  onSave,
  onMention,
  onAsk,
}: WorkspaceFilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTriggerRef = useRef<HTMLButtonElement>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const recognition = file?.recognition ?? entry?.recognition;
  const editable = isEditablePath(path) && file?.content !== null && file !== null;
  const recognizedMarkdown = Boolean(
    recognition?.status === 'ready' && recognition.ragSource && /\.(md|markdown)$/i.test(recognition.ragSource)
  );
  const markdown = ['md', 'markdown'].includes(workspaceFileExtension(path)) || recognizedMarkdown;
  const sourceText = editing ? draft : (file?.content ?? '');
  const loadImage = useCallback(async (src: string, alt?: string) => {
    const assetPath = matchWorkspaceImage(files, path, src, alt);
    if (!assetPath) return null;
    const blob = await workspaceService.fetchFileBlob(assetPath);
    return URL.createObjectURL(blob);
  }, [files, path]);
  const canCopy = !loading && !error && sourceText.trim().length > 0;
  const dirty = editing && draft !== (file?.content ?? '');
  const meta = [
    formatBytes(entry?.size),
    entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
  ].filter(Boolean);

  const startEdit = () => {
    setDraft(file?.content ?? '');
    setEditing(true);
  };

  const markCopied = () => {
    setCopied(true);
    setCopyOpen(false);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  const copyPlain = async () => {
    try {
      await navigator.clipboard.writeText(markdown ? markdownPlain(sourceText) : sourceText);
      markCopied();
    } catch {
      showErrorToast('Не удалось скопировать текст');
    }
  };

  const copyFormatted = async () => {
    try {
      if (markdown) {
        await writeClipboard(sourceText, markdownHtml(sourceText));
      } else {
        await navigator.clipboard.writeText(sourceText);
      }
      markCopied();
    } catch {
      showErrorToast('Не удалось скопировать текст');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={path}>
            {path.split('/').pop()}
          </p>
          <p className="truncate text-[11px] text-muted-foreground" title={path}>
            {[path.includes('/') ? path : null, ...meta].filter(Boolean).join(' · ')}
          </p>
        </div>
        {canCopy && (
          <>
            <button
              ref={copyTriggerRef}
              type="button"
              className={iconButton}
              onClick={() => {
                if (!markdown) void copyPlain();
                else setCopyOpen((open) => !open);
              }}
              title={copied ? 'Скопировано' : 'Копировать'}
              aria-label={copied ? 'Скопировано' : 'Копировать'}
              aria-expanded={copyOpen}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <MenuPopover
              open={copyOpen && markdown}
              onClose={() => setCopyOpen(false)}
              triggerRef={copyTriggerRef}
              align="end"
              matchTriggerWidth={false}
              minWidth={220}
              zIndex={80}
            >
              <button
                type="button"
                onClick={() => void copyPlain()}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
              >
                Без разметки
              </button>
              <button
                type="button"
                onClick={() => void copyFormatted()}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
              >
                С форматированием
              </button>
            </MenuPopover>
          </>
        )}
        <button type="button" className={iconButton} onClick={onMention} title="Упомянуть файл в задаче" aria-label="Упомянуть файл в задаче">
          <MessageSquarePlus className="h-4 w-4" />
        </button>
        {editable && !editing && (
          <button type="button" className={iconButton} onClick={startEdit} title="Править" aria-label="Править">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button type="button" className={iconButton} onClick={onDownload} title="Скачать" aria-label="Скачать">
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(iconButton, 'hover:text-destructive')}
          onClick={onDelete}
          title="Удалить"
          aria-label="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} onClick={onClose} title="Закрыть" aria-label="Закрыть">
          <X className="h-4 w-4" />
        </button>
      </div>

      {recognition && (
        <div
          className={cn(
            'flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-[11px]',
            recognition.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {isRecognitionPending(recognition) && <Loader2 className="h-3 w-3 animate-spin" />}
          <span className="min-w-0 flex-1 truncate">{recognitionLabel(recognition)}</span>
          {recognition.ragSource && recognition.status === 'ready' && onAsk && (
            <button
              type="button"
              onClick={() => onAsk(recognition.ragSource!)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10"
              title={`Источник в поиске: ${recognition.ragSource}`}
            >
              <BarChart3 className="h-3 w-3" />
              Спросить в Аналитике
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-muted/25 p-3 sm:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Открываю…
          </div>
        ) : error ? (
          <p className="workspace-file-sheet text-sm text-destructive">{error}</p>
        ) : editing ? (
          <textarea
            id="workspace-file-editor"
            name="content"
            aria-label={`Содержимое ${path}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            className="workspace-file-sheet h-full min-h-full w-full resize-none font-mono text-[13px] leading-relaxed focus:outline-none"
            autoFocus
          />
        ) : file?.content === null || !file ? (
          <div className="workspace-file-sheet text-sm leading-relaxed text-muted-foreground">
            {file?.message ??
              (isRecognitionPending(recognition)
                ? 'Текст появится, когда закончится распознавание.'
                : 'Предпросмотр для этого файла недоступен — скачайте его.')}
          </div>
        ) : file.content.trim() === '' ? (
          <p className="workspace-file-sheet text-sm text-muted-foreground">Файл пустой.</p>
        ) : markdown ? (
          <div className="workspace-file-sheet chat-msg-ai text-sm">
            <ChatMarkdown content={file.content} isDarkMode={isDarkMode} loadImage={loadImage} />
          </div>
        ) : (
          <pre className="workspace-file-sheet whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">{file.content}</pre>
        )}
      </div>

      {editing && (
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-3 py-2">
          <span className="mr-auto text-[11px] text-muted-foreground">
            {dirty ? 'Замену существующего файла попросят подтвердить' : 'Без изменений'}
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-8 rounded-xl px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => {
              void onSave(draft).then((saved) => {
                if (saved) setEditing(false);
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl btn-gradient px-3 text-xs font-medium disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}
