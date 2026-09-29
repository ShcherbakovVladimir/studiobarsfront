import type {
  WorkspaceChange,
  WorkspaceConfirmation,
  WorkspaceEntry,
  WorkspaceRecognition,
  WorkspaceStep,
} from '../../services/workspaceService';

export type ConfirmationState = 'pending' | 'approved' | 'rejected' | 'expired' | 'busy';

export interface FeedConfirmation extends WorkspaceConfirmation {
  state: ConfirmationState;
}

export interface FeedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  steps?: WorkspaceStep[];
  changes?: WorkspaceChange[];
  confirmations?: FeedConfirmation[];
  streaming?: boolean;
  interrupted?: boolean;
  error?: string;
}

export interface StoredFeed {
  sessionId: string;
  messages: FeedMessage[];
}

const FEED_LIMIT = 80;

const feedKey = (userId: string) => `workspace-feed:u_${userId}`;

export function createWorkspaceSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `ws-${Date.now().toString(36)}-${rand}`;
}

export function loadFeed(userId: string): StoredFeed | null {
  try {
    const raw = localStorage.getItem(feedKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFeed;
    if (!parsed?.sessionId || !Array.isArray(parsed.messages)) return null;
    return {
      sessionId: parsed.sessionId,
      messages: parsed.messages.map((message) =>
        message.streaming ? { ...message, streaming: false, interrupted: true } : message
      ),
    };
  } catch {
    return null;
  }
}

export function saveFeed(userId: string, feed: StoredFeed): void {
  try {
    localStorage.setItem(
      feedKey(userId),
      JSON.stringify({ sessionId: feed.sessionId, messages: feed.messages.slice(-FEED_LIMIT) })
    );
  } catch {
    /* переполнен localStorage — лента останется только в памяти */
  }
}

function fileName(path?: string): string {
  if (!path) return '';
  return `«${path}»`;
}

const STEP_VERBS: Record<string, [running: string, done: string]> = {
  workspace_list: ['Смотрю, какие файлы есть в папке', 'Просмотрел список файлов'],
  workspace_read: ['Читаю', 'Прочитал'],
  workspace_write: ['Записываю', 'Записал'],
  workspace_edit: ['Правлю', 'Поправил'],
  workspace_delete: ['Собираюсь удалить', 'Удаление'],
  search_documents: ['Ищу в документах', 'Поиск в документах'],
  ask_rag: ['Спрашиваю базу знаний', 'Ответ базы знаний'],
  calculate: ['Считаю', 'Посчитал'],
};

/** Строка ленты: «Читаю «report.md»», по завершении — summary сервера. */
export function stepLabel(step: WorkspaceStep): string {
  if (step.phase === 'done' && step.summary) return step.summary;
  const verbs = STEP_VERBS[step.name];
  const target = step.name === 'workspace_list' ? '' : fileName(step.path);
  if (!verbs) return step.summary ?? `Инструмент ${step.name}`;
  const verb = step.phase === 'done' ? verbs[1] : verbs[0];
  return target ? `${verb} ${target}` : verb;
}

export const CHANGE_LABELS: Record<string, string> = {
  created: 'создан',
  edited: 'поправлен',
  overwritten: 'заменён',
  deleted: 'удалён',
};

export function changeLabel(change: WorkspaceChange): string {
  const base = CHANGE_LABELS[change.action] ?? change.action;
  if (change.action === 'edited' && change.replacements) {
    return `${base} · правок: ${change.replacements}`;
  }
  return base;
}

/** Последнее изменение по каждому пути: «создан», потом «поправлен» → остаётся «создан». */
export function mergeChanges(changes: WorkspaceChange[]): WorkspaceChange[] {
  const byPath = new Map<string, WorkspaceChange>();
  for (const change of changes) {
    const prev = byPath.get(change.path);
    if (!prev) {
      byPath.set(change.path, change);
      continue;
    }
    if (change.action === 'deleted') {
      if (prev.action === 'created') byPath.delete(change.path);
      else byPath.set(change.path, change);
      continue;
    }
    if (prev.action === 'created') {
      byPath.set(change.path, { ...change, action: 'created' });
      continue;
    }
    byPath.set(change.path, change);
  }
  return [...byPath.values()];
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} КБ`;
  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

export function recognitionLabel(recognition?: WorkspaceRecognition): string | null {
  if (!recognition) return null;
  if (recognition.message) return recognition.message;
  switch (recognition.status) {
    case 'queued':
      return 'В очереди на распознавание';
    case 'processing':
      return recognition.progress !== null ? `Распознаётся · ${recognition.progress}%` : 'Распознаётся';
    case 'ready':
      return 'В поиске';
    case 'error':
      return 'Ошибка распознавания';
    default:
      return recognition.status;
  }
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  entry?: WorkspaceEntry;
  children: TreeNode[];
}

/** Плоский список `entries` → дерево. Папки без своей записи достраиваются из путей файлов. */
export function buildTree(entries: WorkspaceEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'dir', children: [] };
  const dirs = new Map<string, TreeNode>([['', root]]);

  const ensureDir = (path: string): TreeNode => {
    const existing = dirs.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf('/');
    const parent = ensureDir(slash >= 0 ? path.slice(0, slash) : '');
    const node: TreeNode = { name: path.slice(slash + 1), path, type: 'dir', children: [] };
    parent.children.push(node);
    dirs.set(path, node);
    return node;
  };

  for (const entry of entries) {
    const path = entry.path.replace(/\/+$/, '');
    if (entry.type === 'dir') {
      ensureDir(path).entry = entry;
      continue;
    }
    const slash = path.lastIndexOf('/');
    const parent = ensureDir(slash >= 0 ? path.slice(0, slash) : '');
    parent.children.push({ name: entry.name || path.slice(slash + 1), path, type: 'file', entry, children: [] });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name, 'ru')));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

export function parentFolder(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : '';
}

export const TEXT_EXTENSIONS = new Set(['md', 'txt', 'log', 'csv', 'json', 'html', 'xml', 'yaml', 'yml']);

/** Текстовые файлы можно править в панели; PDF и Office — только смотреть распознанный текст. */
export function isEditablePath(path: string): boolean {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  return dot < 0 || TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}
