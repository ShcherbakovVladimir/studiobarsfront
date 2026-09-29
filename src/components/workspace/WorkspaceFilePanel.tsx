import React, { useState } from 'react';
import { BarChart3, Download, Loader2, MessageSquarePlus, Pencil, Save, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatMarkdown } from '../markdown/ChatMarkdown';
import {
  isRecognitionPending,
  workspaceFileExtension,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from '../../services/workspaceService';
import { formatBytes, isEditablePath, recognitionLabel } from './workspaceModel';

interface WorkspaceFilePanelProps {
  path: string;
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

export function WorkspaceFilePanel({
  path,
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

  const recognition = file?.recognition ?? entry?.recognition;
  const editable = isEditablePath(path) && file?.content !== null && file !== null;
  const markdown = ['md', 'markdown'].includes(workspaceFileExtension(path));
  const dirty = editing && draft !== (file?.content ?? '');
  const meta = [
    formatBytes(entry?.size),
    entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
  ].filter(Boolean);

  const startEdit = () => {
    setDraft(file?.content ?? '');
    setEditing(true);
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

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Открываю…
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">{error}</p>
        ) : editing ? (
          <textarea
            id="workspace-file-editor"
            name="content"
            aria-label={`Содержимое ${path}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed focus:outline-none"
            autoFocus
          />
        ) : file?.content === null || !file ? (
          <div className="p-4 text-sm leading-relaxed text-muted-foreground">
            {file?.message ??
              (isRecognitionPending(recognition)
                ? 'Текст появится, когда закончится распознавание.'
                : 'Предпросмотр для этого файла недоступен — скачайте его.')}
          </div>
        ) : file.content.trim() === '' ? (
          <p className="p-4 text-sm text-muted-foreground">Файл пустой.</p>
        ) : markdown ? (
          <div className="chat-msg-ai px-4 py-3 text-sm">
            <ChatMarkdown content={file.content} isDarkMode={isDarkMode} />
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed">{file.content}</pre>
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
