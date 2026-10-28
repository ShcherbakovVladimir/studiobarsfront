import React, { useEffect, useState } from 'react';
import { ApiError } from '../../services/apiClient';
import {
  chatStatus,
  compactChat,
  createFolder,
  enqueueMessage,
  fetchPublicUrl,
  listFolders,
  listQueue,
  removeQueuedMessage,
  shareChat,
  uploadChatFile,
  type ChatFolder,
  type ChatQueueItem,
} from '../../services/chatDeskService';
import { showSuccessToast } from '../../services/toastService';
import { InlineError } from '../ui/alert-banner';

export type DeskPanel = 'queue' | 'share' | 'file' | 'folder' | 'status' | 'page' | null;

function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос';
}

const ChatSessionTools: React.FC<{
  chatId: string;
  panel: DeskPanel;
  onClose: () => void;
  onFolder: (folderId: string | null) => void;
}> = ({ chatId, panel, onClose, onFolder }) => {
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<ChatQueueItem[]>([]);
  const [draft, setDraft] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'read' | 'reply'>('read');
  const [fileMode, setFileMode] = useState<'full' | 'retrieval'>('retrieval');
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [pageText, setPageText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (panel !== 'queue') return;
    void listQueue(chatId).then(setQueue).catch((err: unknown) => setError(errorText(err)));
  }, [chatId, panel]);

  useEffect(() => {
    if (panel !== 'folder') return;
    void listFolders().then(setFolders).catch((err: unknown) => setError(errorText(err)));
  }, [panel]);

  useEffect(() => {
    if (panel !== 'status') return;
    void chatStatus(chatId)
      .then((row) => {
        const turns = row.turnCount ?? '—';
        const tokens = row.approxTokens ?? '—';
        const queued = row.queued ?? 0;
        const loaded = row.modelMatchesLoaded === false ? 'Модель чата не совпадает с загруженной.' : '';
        setStatusText(`Ходы ${String(turns)}, оценка токенов ${String(tokens)}, в очереди ${String(queued)}. ${loaded}`);
      })
      .catch((err: unknown) => setError(errorText(err)));
  }, [chatId, panel]);

  if (!panel) return null;

  const run = async (action: () => Promise<void>, done: string) => {
    setError(null);
    try {
      await action();
      showSuccessToast(done);
    } catch (err: unknown) {
      setError(errorText(err));
    }
  };

  return (
    <div className="mb-2 rounded-lg border border-border bg-card p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {panel === 'queue' && 'Очередь'}
          {panel === 'share' && 'Общий чат'}
          {panel === 'file' && 'Файл чата'}
          {panel === 'folder' && 'Папка'}
          {panel === 'status' && 'Статус'}
          {panel === 'page' && 'Публичная страница'}
        </span>
        <button type="button" className="text-xs text-muted-foreground" onClick={onClose}>
          Закрыть
        </button>
      </div>
      {error && <InlineError message={error} />}
      {panel === 'queue' && (
        <>
          <ul className="space-y-1">
            {queue.length === 0 && <li className="text-xs text-muted-foreground">Очередь пуста.</li>}
            {queue.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.content || item.text}</span>
                <button type="button" className="text-xs text-red-600" onClick={() => void run(async () => {
                  await removeQueuedMessage(chatId, item.id);
                  setQueue(await listQueue(chatId));
                }, 'Убрано из очереди')}>
                  Убрать
                </button>
              </li>
            ))}
          </ul>
          <form className="flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            const content = draft.trim();
            if (!content) return;
            void run(async () => {
              await enqueueMessage(chatId, content);
              setDraft('');
              setQueue(await listQueue(chatId));
            }, 'Добавлено в очередь');
          }}>
            <input id="chat-queue-draft" name="queue" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1" placeholder="Следующее сообщение" />
            <button type="submit" className="rounded-lg border border-border px-2 py-1">В очередь</button>
          </form>
        </>
      )}
      {panel === 'share' && (
        <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          void run(() => shareChat(chatId, email.trim(), mode), 'Доступ выдан');
        }}>
          <input id="share-email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="коллега@example.com" className="w-full rounded-lg border border-border bg-background px-2 py-1" />
          <select id="share-mode" name="mode" value={mode} onChange={(event) => setMode(event.target.value === 'reply' ? 'reply' : 'read')} className="w-full rounded-lg border border-border bg-background px-2 py-1">
            <option value="read">Только чтение</option>
            <option value="reply">С ответами</option>
          </select>
          <button type="submit" className="rounded-lg bg-primary px-3 py-1 text-primary-foreground">Открыть</button>
        </form>
      )}
      {panel === 'file' && (
        <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem('chatFile');
          const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
          if (!file) return;
          void run(() => uploadChatFile(chatId, file, fileMode), 'Файл прикреплён к чату');
        }}>
          <select id="file-mode" name="fileMode" value={fileMode} onChange={(event) => setFileMode(event.target.value === 'full' ? 'full' : 'retrieval')} className="w-full rounded-lg border border-border bg-background px-2 py-1">
            <option value="retrieval">Поиск по фрагментам</option>
            <option value="full">Документ целиком</option>
          </select>
          <input id="chat-file" name="chatFile" type="file" required className="block w-full text-xs" />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1 text-primary-foreground">Загрузить</button>
        </form>
      )}
      {panel === 'folder' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <button type="button" className="rounded-lg border border-border px-2 py-1" onClick={() => onFolder(null)}>Без папки</button>
            {folders.map((folder) => (
              <button key={folder.id} type="button" className="rounded-lg border border-border px-2 py-1" onClick={() => onFolder(folder.id)}>
                {folder.name}
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            const name = folderName.trim();
            if (!name) return;
            void run(async () => {
              await createFolder({ name });
              setFolderName('');
              setFolders(await listFolders());
            }, 'Папка создана');
          }}>
            <input id="folder-name" name="name" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Имя папки" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1" />
            <button type="submit" className="rounded-lg border border-border px-2 py-1">Создать</button>
          </form>
        </div>
      )}
      {panel === 'status' && <p className="text-xs text-muted-foreground">{statusText || 'Считаю…'}</p>}
      {panel === 'page' && (
        <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          void run(async () => setPageText(await fetchPublicUrl(pageUrl.trim())), 'Страница прочитана');
        }}>
          <input id="page-url" name="url" type="url" required value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} placeholder="https://" className="w-full rounded-lg border border-border bg-background px-2 py-1" />
          <button type="submit" className="rounded-lg border border-border px-2 py-1">Открыть</button>
          {pageText && <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">{pageText.slice(0, 4000)}</pre>}
        </form>
      )}
      {panel === 'status' && (
        <button type="button" className="text-xs underline" onClick={() => void run(() => compactChat(chatId), 'История сжата')}>
          Сжать историю
        </button>
      )}
    </div>
  );
};

export default ChatSessionTools;
