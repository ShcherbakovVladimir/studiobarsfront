import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronRight,
  FilePlus,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  WORKSPACE_MAX_MB,
  WORKSPACE_UPLOAD_ACCEPT,
  isRecognitionPending,
  workspaceFileExtension,
  type WorkspaceEntry,
} from '../../services/workspaceService';
import { CHANGE_LABELS, buildTree, formatBytes, recognitionLabel, type TreeNode } from './workspaceModel';

export interface UploadProgress {
  name: string;
  percent: number;
}

interface WorkspaceFileTreeProps {
  entries: WorkspaceEntry[];
  loading: boolean;
  error: string | null;
  truncated: boolean;
  selectedPath: string | null;
  targetFolder: string;
  recentChanges: Record<string, string>;
  uploads: UploadProgress[];
  onOpen: (path: string) => void;
  onTargetFolder: (folder: string) => void;
  onUpload: (files: File[]) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

function FileKindIcon({ path }: { path: string }) {
  const ext = workspaceFileExtension(path);
  const className = 'h-4 w-4 shrink-0 text-muted-foreground';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={className} />;
  if (['md', 'txt', 'doc', 'docx', 'pdf', 'rtf', 'log'].includes(ext)) return <FileText className={className} />;
  return <FileIcon className={className} />;
}

const CHANGE_TONE: Record<string, string> = {
  created: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  edited: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  overwritten: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

function RecognitionMark({ entry }: { entry?: WorkspaceEntry }) {
  const recognition = entry?.recognition;
  if (!recognition) return null;
  const label = recognitionLabel(recognition) ?? '';
  if (recognition.status === 'error') {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label={label} />;
  }
  if (isRecognitionPending(recognition)) {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" aria-label={label} />;
  }
  return null;
}

interface NodeProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  props: WorkspaceFileTreeProps;
}

function TreeRow({ node, depth, expanded, toggle, props }: NodeProps) {
  const indent = { paddingLeft: `${0.5 + depth * 0.875}rem` };

  if (node.type === 'dir') {
    const open = expanded.has(node.path);
    const isTarget = props.targetFolder === node.path;
    return (
      <li>
        <button
          type="button"
          onClick={() => {
            toggle(node.path);
            props.onTargetFolder(open && isTarget ? '' : node.path);
          }}
          className={cn(
            'flex w-full items-center gap-1.5 rounded-xl py-1.5 pr-2 text-left text-sm transition-colors hover:bg-accent/60',
            isTarget && 'bg-accent/50'
          )}
          style={indent}
          aria-expanded={open}
        >
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
          {open ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          )}
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <span className="text-[10px] text-muted-foreground">{node.children.length || ''}</span>
        </button>
        {open && node.children.length > 0 && (
          <ul>
            {node.children.map((child) => (
              <TreeRow key={child.path} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} props={props} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const change = props.recentChanges[node.path];
  const selected = props.selectedPath === node.path;
  const recognition = recognitionLabel(node.entry?.recognition);
  const size = formatBytes(node.entry?.size);

  return (
    <li>
      <button
        type="button"
        onClick={() => props.onOpen(node.path)}
        className={cn(
          'group flex w-full items-center gap-1.5 rounded-xl py-1.5 pr-2 text-left text-sm transition-colors',
          selected ? 'bg-primary/10 text-foreground' : 'hover:bg-accent/60'
        )}
        style={{ paddingLeft: `${1.375 + depth * 0.875}rem` }}
        title={[node.path, size, recognition].filter(Boolean).join(' · ')}
      >
        <FileKindIcon path={node.path} />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {change && CHANGE_LABELS[change] && (
          <span className={cn('shrink-0 rounded-md px-1.5 py-px text-[10px] font-medium', CHANGE_TONE[change])}>
            {CHANGE_LABELS[change]}
          </span>
        )}
        <RecognitionMark entry={node.entry} />
        {!change && size && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100">
            {size}
          </span>
        )}
      </button>
    </li>
  );
}

export function WorkspaceFileTree(props: WorkspaceFileTreeProps) {
  const { entries, loading, error, truncated, targetFolder, uploads, onUpload, onCreate, onRefresh } = props;
  const tree = useMemo(() => buildTree(entries), [entries]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const fileCount = entries.filter((entry) => entry.type === 'file').length;

  return (
    <div
      className={cn('relative flex h-full min-h-0 flex-col', dragging && 'ring-2 ring-inset ring-primary/50')}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length) onUpload(files);
      }}
    >
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl btn-gradient px-3 text-xs font-medium"
          title={`PDF, Word, Excel, PowerPoint, txt, md, csv, json, html, xml, rtf · до ${WORKSPACE_MAX_MB} МБ`}
        >
          <Upload className="h-3.5 w-3.5" />
          Загрузить
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Новый текстовый файл"
          aria-label="Новый текстовый файл"
        >
          <FilePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Обновить список"
          aria-label="Обновить список"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <input
          ref={inputRef}
          id="workspace-upload-input"
          name="file"
          type="file"
          multiple
          accept={WORKSPACE_UPLOAD_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) onUpload(files);
          }}
        />
      </div>

      {targetFolder && (
        <div className="flex items-center gap-1 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">
            Загрузка в папку <span className="font-medium text-foreground">{targetFolder}/</span>
          </span>
          <button type="button" className="shrink-0 hover:text-foreground" onClick={() => props.onTargetFolder('')}>
            в корень
          </button>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="space-y-1.5 border-b border-border/60 px-3 py-2">
          {uploads.map((upload) => (
            <li key={upload.name} className="text-[11px]">
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span className="truncate">{upload.name}</span>
                <span className="tabular-nums">{upload.percent}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${upload.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-2">
        {error && tree.length > 0 && (
          <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <span className="min-w-0 flex-1 truncate" title={error}>
              Список мог устареть: {error}
            </span>
            <button type="button" onClick={onRefresh} className="shrink-0 underline underline-offset-2">
              Обновить
            </button>
          </div>
        )}
        {error && tree.length === 0 ? (
          <div className="space-y-2 px-2 py-4 text-center text-xs text-destructive">
            <p>{error}</p>
            <button type="button" onClick={onRefresh} className="underline underline-offset-2">
              Повторить
            </button>
          </div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs leading-relaxed text-muted-foreground">
            {loading ? (
              'Загрузка…'
            ) : (
              <>
                <p className="mb-1 font-medium text-foreground">Папка пустая</p>
                Перетащите сюда документы или нажмите «Загрузить». Модель тоже может создавать файлы сама.
              </>
            )}
          </div>
        ) : (
          <ul>
            {tree.map((node) => (
              <TreeRow key={node.path} node={node} depth={0} expanded={expanded} toggle={toggle} props={props} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
        {fileCount} {pluralFiles(fileCount)}
        {truncated && ' · показаны не все'}
        <span className="block opacity-80">Перетащите файлы сюда, чтобы загрузить</span>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-background/80 text-sm font-medium text-primary">
          Отпустите, чтобы загрузить{targetFolder ? ` в ${targetFolder}/` : ''}
        </div>
      )}
    </div>
  );
}

function pluralFiles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'файл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'файла';
  return 'файлов';
}
