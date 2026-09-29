import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, X } from 'lucide-react';
import type { RootState } from '../store/store';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';
import { isEmployee } from '../utils/auth';
import { ContextUsageRing } from '../components/ContextUsageRing';
import { registerActiveStream } from '../utils/activeStreams';
import type { ContextLimitNotice } from '../utils/contextLimit';
import type { ContextUsage } from '../utils/contextUsage';
import { ApiError } from '../services/apiClient';
import { confirmDialog, promptDialog } from '../services/dialogService';
import { showErrorToast, showInfoToast, showSuccessToast } from '../services/toastService';
import workspaceService, {
  WorkspaceConfirmationExpiredError,
  isRecognitionPending,
  type WorkspaceChange,
  type WorkspaceConfirmation,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from '../services/workspaceService';
import { WorkspaceFileTree, type UploadProgress } from '../components/workspace/WorkspaceFileTree';
import { WorkspaceFilePanel } from '../components/workspace/WorkspaceFilePanel';
import { WorkspaceTaskFeed } from '../components/workspace/WorkspaceTaskFeed';
import {
  createWorkspaceSessionId,
  loadFeed,
  saveFeed,
  type FeedConfirmation,
  type FeedMessage,
} from '../components/workspace/workspaceModel';

const RECOGNITION_POLL_MS = 5000;

const SUGGESTIONS = [
  'Собери в notes.md краткий конспект из файлов папки',
  'Что лежит в папке? Коротко опиши каждый файл',
  'Найди в документах сроки и суммы и сведи их в таблицу summary.md',
];

function messageId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function taskErrorMessage(error: unknown, employee: boolean): { text: string; code?: string } {
  if (error instanceof ApiError) {
    if (error.code === 'QWEN_REQUIRED') {
      return {
        code: error.code,
        text: employee
          ? 'Рабочая папка работает только с моделью Qwen. Попросите администратора загрузить Qwen.'
          : 'Рабочая папка работает только с моделью Qwen. Загрузите Qwen в каталоге моделей.',
      };
    }
    if (error.code === 'MODEL_NOT_READY') {
      return { code: error.code, text: 'Модель ещё не загружена. Подождите загрузки и повторите.' };
    }
    return { code: error.code, text: error.message };
  }
  return { text: error instanceof Error ? error.message : 'Задача завершилась с ошибкой' };
}

function isAbort(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
}

const StopIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const WorkspacePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const employee = isEmployee(user);
  const navigate = useNavigate();
  const userId = user?.id ?? 'anon';

  // --- Папка -----------------------------------------------------------------
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [targetFolder, setTargetFolder] = useState('');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [recentChanges, setRecentChanges] = useState<Record<string, string>>({});
  const [filesOpen, setFilesOpen] = useState(false);

  // --- Открытый файл ---------------------------------------------------------
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [file, setFile] = useState<WorkspaceFileContent | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedPathRef = useRef<string | null>(null);
  selectedPathRef.current = selectedPath;

  // --- Задача ----------------------------------------------------------------
  const initialFeed = useMemo(() => loadFeed(userId), [userId]);
  const [sessionId, setSessionId] = useState(() => initialFeed?.sessionId ?? createWorkspaceSessionId());
  const [messages, setMessages] = useState<FeedMessage[]>(() => initialFeed?.messages ?? []);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [usage, setUsage] = useState<ContextUsage | null>(null);
  const [contextLimit, setContextLimit] = useState<ContextLimitNotice | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    saveFeed(userId, { sessionId, messages });
  }, [userId, sessionId, messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const listSeqRef = useRef(0);

  /**
   * Список обновляется из нескольких мест сразу (конец задачи, опрос распознавания, фокус окна):
   * применяется только самый свежий ответ. Разовый сбой не стирает дерево — один повтор через 1.5 с.
   */
  const refresh = useCallback(async (): Promise<WorkspaceEntry[] | null> => {
    const seq = ++listSeqRef.current;
    setListLoading(true);
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const listing = await workspaceService.list();
          if (seq !== listSeqRef.current) return listing.entries;
          setEntries(listing.entries);
          setTruncated(listing.truncated);
          setListError(null);
          return listing.entries;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Не удалось получить список файлов';
          const status = error instanceof ApiError ? error.status : 0;
          console.warn(`GET /api/workspace (попытка ${attempt + 1}): ${message}`);
          if (attempt === 0 && status !== 401 && status !== 403) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500));
            if (seq !== listSeqRef.current) return null;
            continue;
          }
          if (seq === listSeqRef.current) setListError(message);
          return null;
        }
      }
    } finally {
      if (seq === listSeqRef.current) setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadFile = useCallback(async (path: string, quiet = false) => {
    if (!quiet) {
      setFileLoading(true);
      setFile(null);
    }
    setFileError(null);
    try {
      const content = await workspaceService.read(path);
      if (selectedPathRef.current === path) setFile(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось открыть файл';
      console.warn(`GET /api/workspace/file?path=${path}: ${message}`);
      // Тихое перечитывание после правки не прячет уже показанный текст.
      if (selectedPathRef.current === path && !quiet) {
        setFileError(message);
      }
    } finally {
      if (selectedPathRef.current === path) setFileLoading(false);
    }
  }, []);

  const openFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      selectedPathRef.current = path;
      setFilesOpen(false);
      void loadFile(path);
    },
    [loadFile]
  );

  const closeFile = useCallback(() => {
    setSelectedPath(null);
    setFile(null);
    setFileError(null);
  }, []);

  const pendingRecognition = entries.some((entry) => isRecognitionPending(entry.recognition));

  useEffect(() => {
    if (!pendingRecognition) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void refresh().then((next) => {
        const path = selectedPathRef.current;
        if (!next || !path) return;
        const entry = next.find((item) => item.path === path);
        if (entry?.recognition?.status === 'ready') void loadFile(path, true);
      });
    }, RECOGNITION_POLL_MS);
    return () => window.clearInterval(timer);
  }, [pendingRecognition, refresh, loadFile]);

  useEffect(() => {
    const onFocus = () => {
      if (!streaming) void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh, streaming]);

  const applyChanges = useCallback(
    async (changes: WorkspaceChange[]) => {
      if (changes.length === 0) return;
      setRecentChanges((prev) => {
        const next = { ...prev };
        for (const change of changes) {
          if (change.action === 'deleted') delete next[change.path];
          else next[change.path] = next[change.path] === 'created' ? 'created' : change.action;
        }
        return next;
      });
      await refresh();
      const open = selectedPathRef.current;
      const touchedAll = open ? changes.filter((change) => change.path === open) : [];
      const touched = touchedAll[touchedAll.length - 1];
      if (open && touched) {
        if (touched.action === 'deleted') closeFile();
        else void loadFile(open, true);
      }
    },
    [refresh, closeFile, loadFile]
  );

  // --- Подтверждения для ручных действий ----------------------------------------

  /** Диалог «Заменить/Удалить» → POST /workspace/confirm. true — действие выполнено. */
  const resolveManually = useCallback(
    async (confirmation: WorkspaceConfirmation): Promise<boolean> => {
      const destructive = confirmation.action === 'delete';
      const approve = await confirmDialog({
        title: destructive ? 'Удалить файл?' : 'Заменить файл?',
        description: confirmation.message,
        confirmLabel: destructive ? 'Удалить' : 'Заменить',
        destructive,
      });
      try {
        const result = await workspaceService.confirm(confirmation.confirmationId, approve);
        if (result.status === 'cancelled') return false;
        await applyChanges([
          result.change ?? { path: confirmation.path, action: destructive ? 'deleted' : 'overwritten' },
        ]);
        return true;
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Подтверждение не прошло');
        return false;
      }
    },
    [applyChanges]
  );

  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      const path = selectedPathRef.current;
      if (!path) return false;
      setSaving(true);
      try {
        const outcome = await workspaceService.write(path, content);
        const done =
          outcome.status === 'done'
            ? (await applyChanges([outcome.change ?? { path, action: 'created' }]), true)
            : await resolveManually(outcome.confirmation);
        if (done) showSuccessToast(`Сохранено: ${path}`);
        return done;
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Не удалось сохранить');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [applyChanges, resolveManually]
  );

  const deleteFile = useCallback(async () => {
    const path = selectedPathRef.current;
    if (!path) return;
    try {
      const confirmation = await workspaceService.requestDelete(path);
      if (await resolveManually(confirmation)) showSuccessToast(`Удалено: ${path}`);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Не удалось удалить');
    }
  }, [resolveManually]);

  const downloadFile = useCallback(async () => {
    const path = selectedPathRef.current;
    if (!path) return;
    try {
      await workspaceService.download(path);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Не удалось скачать');
    }
  }, []);

  const createFile = useCallback(async () => {
    const raw = await promptDialog({
      title: 'Новый файл',
      description: targetFolder ? `В папке ${targetFolder}/` : 'В корне рабочей папки',
      defaultValue: 'notes.md',
      placeholder: 'notes.md',
      confirmLabel: 'Создать',
    });
    const name = raw?.trim().replace(/^\/+/, '');
    if (!name) return;
    if (name.split('/').includes('..')) {
      showErrorToast('Путь не может выходить за пределы рабочей папки');
      return;
    }
    const path = targetFolder ? `${targetFolder}/${name}` : name;
    try {
      const outcome = await workspaceService.write(path, '');
      if (outcome.status === 'confirm') {
        await workspaceService.confirm(outcome.confirmation.confirmationId, false).catch(() => undefined);
        showInfoToast(`Файл «${path}» уже есть — открываю его`);
      } else {
        await applyChanges([outcome.change ?? { path, action: 'created' }]);
      }
      openFile(path);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Не удалось создать файл');
    }
  }, [targetFolder, applyChanges, openFile]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const folder = targetFolder;
      for (const item of files) {
        setUploads((prev) => [...prev.filter((u) => u.name !== item.name), { name: item.name, percent: 0 }]);
        try {
          const outcome = await workspaceService.upload(item, folder, (percent) =>
            setUploads((prev) => prev.map((u) => (u.name === item.name ? { ...u, percent } : u)))
          );
          const path = folder ? `${folder}/${item.name}` : item.name;
          if (outcome.status === 'confirm') {
            await resolveManually(outcome.confirmation);
          } else {
            await applyChanges([outcome.change ?? { path, action: 'created' }]);
          }
        } catch (error) {
          showErrorToast(error instanceof Error ? error.message : `Не удалось загрузить «${item.name}»`);
        } finally {
          setUploads((prev) => prev.filter((u) => u.name !== item.name));
        }
      }
    },
    [targetFolder, applyChanges, resolveManually]
  );

  const mentionFile = useCallback((path: string) => {
    setInput((prev) => {
      const mention = `«${path}»`;
      if (prev.includes(mention)) return prev;
      return prev.trim() ? `${prev.trimEnd()} ${mention} ` : `${mention} `;
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // --- Задача ------------------------------------------------------------------

  const patchMessage = useCallback((id: string, patch: (message: FeedMessage) => FeedMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? patch(message) : message)));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || streaming) return;
      setInput('');
      stickRef.current = true;

      const assistantId = messageId();
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { id: messageId(), role: 'user', content: prompt, createdAt: now },
        { id: assistantId, role: 'assistant', content: '', createdAt: now, steps: [], streaming: true },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      const unregister = registerActiveStream(() => controller.abort());
      setStreaming(true);

      // Токены копятся и попадают в состояние раз за кадр, а не на каждый чанк.
      let pendingText: string | null = null;
      let frame = 0;
      const flush = () => {
        frame = 0;
        if (pendingText === null) return;
        const content = pendingText;
        pendingText = null;
        patchMessage(assistantId, (message) => ({ ...message, content }));
      };

      try {
        const result = await workspaceService.runTask({ message: prompt, sessionId }, controller.signal, {
          onStep: (step) =>
            patchMessage(assistantId, (message) => {
              const steps = message.steps ?? [];
              const index = steps.findIndex((item) => item.id === step.id);
              const merged = index >= 0 ? { ...steps[index], ...step, path: step.path ?? steps[index]?.path } : step;
              return {
                ...message,
                steps: index >= 0 ? steps.map((item, i) => (i === index ? merged : item)) : [...steps, merged],
              };
            }),
          onToken: (_token, full) => {
            pendingText = full;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          onConfirmation: (confirmation) =>
            patchMessage(assistantId, (message) => {
              const list = message.confirmations ?? [];
              if (list.some((item) => item.confirmationId === confirmation.confirmationId)) return message;
              return { ...message, confirmations: [...list, { ...confirmation, state: 'pending' }] };
            }),
          onUsage: setUsage,
          onContextLimit: setContextLimit,
        });

        if (frame) cancelAnimationFrame(frame);
        flush();
        if (result.usage) setUsage(result.usage);
        const stopped = controller.signal.aborted;
        patchMessage(assistantId, (message) => ({
          ...message,
          content: result.content || message.content,
          changes: result.changes,
          streaming: false,
          interrupted: stopped || undefined,
          steps: (message.steps ?? []).map((step) => (step.phase === 'start' ? { ...step, phase: 'done' } : step)),
          error:
            !stopped && result.incomplete && !result.content
              ? 'Соединение оборвалось до конца задачи. Файлы, которые модель успела записать, остались в папке.'
              : message.error,
        }));
        if (result.sessionId && result.sessionId !== sessionId) setSessionId(result.sessionId);
        await applyChanges(result.changes);
        if (stopped) void refresh();
      } catch (error) {
        if (frame) cancelAnimationFrame(frame);
        flush();
        const aborted = controller.signal.aborted || isAbort(error);
        const { text: errorText } = taskErrorMessage(error, employee);
        patchMessage(assistantId, (message) => ({
          ...message,
          streaming: false,
          interrupted: aborted || undefined,
          error: aborted ? undefined : errorText,
          steps: (message.steps ?? []).map((step) => (step.phase === 'start' ? { ...step, phase: 'done' } : step)),
        }));
        void refresh();
      } finally {
        unregister();
        if (abortRef.current === controller) abortRef.current = null;
        setStreaming(false);
      }
    },
    [streaming, sessionId, employee, patchMessage, applyChanges, refresh]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const resolveInFeed = useCallback(
    async (messageIdValue: string, confirmation: FeedConfirmation, approve: boolean) => {
      const setState = (state: FeedConfirmation['state']) =>
        patchMessage(messageIdValue, (message) => ({
          ...message,
          confirmations: (message.confirmations ?? []).map((item) =>
            item.confirmationId === confirmation.confirmationId ? { ...item, state } : item
          ),
        }));
      setState('busy');
      try {
        const result = await workspaceService.confirm(confirmation.confirmationId, approve);
        if (result.status === 'cancelled') {
          setState('rejected');
          return;
        }
        setState('approved');
        const change = result.change ?? {
          path: confirmation.path,
          action: confirmation.action === 'delete' ? 'deleted' : 'overwritten',
        };
        patchMessage(messageIdValue, (message) => ({ ...message, changes: [...(message.changes ?? []), change] }));
        await applyChanges([change]);
      } catch (error) {
        if (error instanceof WorkspaceConfirmationExpiredError) {
          setState('expired');
          return;
        }
        setState('pending');
        showErrorToast(error instanceof Error ? error.message : 'Подтверждение не прошло');
      }
    },
    [patchMessage, applyChanges]
  );

  const onResolve = useCallback(
    (id: string, confirmation: FeedConfirmation, approve: boolean) => void resolveInFeed(id, confirmation, approve),
    [resolveInFeed]
  );

  const newTask = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(createWorkspaceSessionId());
    setUsage(null);
    setContextLimit(null);
    setRecentChanges({});
    setInput('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // --- Прокрутка и поле ввода --------------------------------------------------

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && stickRef.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  }, [input]);

  const selectedEntry = selectedPath ? entries.find((entry) => entry.path === selectedPath) : undefined;
  const pendingConfirmations = messages.some((message) =>
    (message.confirmations ?? []).some((item) => item.state === 'pending')
  );
  const canSend = input.trim().length > 0 && !contextLimit;

  const tree = (
    <WorkspaceFileTree
      entries={entries}
      loading={listLoading}
      error={listError}
      truncated={truncated}
      selectedPath={selectedPath}
      targetFolder={targetFolder}
      recentChanges={recentChanges}
      uploads={uploads}
      onOpen={openFile}
      onTargetFolder={setTargetFolder}
      onUpload={(files) => void uploadFiles(files)}
      onCreate={() => void createFile()}
      onRefresh={() => void refresh()}
    />
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden glass-panel text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border/60 lg:flex">
        <div className={cn(celestia.appHeaderBar, 'gap-2')}>
          <FolderOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="text-sm font-semibold">Файлы</span>
        </div>
        {tree}
      </aside>

      {filesOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setFilesOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-background shadow-2xl lg:hidden">
            <div className={cn(celestia.appHeaderBar, 'justify-between')}>
              <span className="text-sm font-semibold">Файлы</span>
              <button
                type="button"
                onClick={() => setFilesOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {tree}
          </aside>
        </>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className={cn(celestia.appHeaderBar, 'gap-2')}>
          <button
            type="button"
            onClick={() => setFilesOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          >
            <FolderOpen className="h-4 w-4" />
            Файлы
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">Рабочая папка</h1>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
              Опишите задачу — модель сама прочитает и запишет файлы в вашей папке
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={newTask}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Начать задачу с чистой памятью. Файлы останутся."
            >
              <Plus className="h-4 w-4" />
              Новая задача
            </button>
          )}
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
          onScroll={(event) => {
            const element = event.currentTarget;
            stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 200;
          }}
        >
          <div className={celestia.chatColumn}>
            {messages.length === 0 ? (
              <div className="mx-auto max-w-xl py-10 text-center">
                <FolderOpen className="mx-auto mb-3 h-10 w-10 text-sky-600/70 dark:text-sky-400/70" />
                <h2 className="mb-1 text-lg font-semibold">Что сделать с файлами?</h2>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  Модель видит только вашу рабочую папку: читает документы, создаёт и правит текстовые файлы. Замену и
                  удаление файла она попросит подтвердить. PDF и Word загружайте сами — кнопкой слева или перетаскиванием.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-2xl border border-border/70 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/60"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <WorkspaceTaskFeed
                messages={messages}
                isDarkMode={isDarkMode}
                onOpenFile={openFile}
                onResolve={onResolve}
              />
            )}
          </div>
        </div>

        <div className={celestia.composerDock}>
          <div className={celestia.chatColumn}>
            {contextLimit && (
              <div className="mb-2 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <span className="min-w-0 flex-1">{contextLimit.message}</span>
                <button type="button" onClick={newTask} className="shrink-0 font-medium underline underline-offset-2">
                  Новая задача
                </button>
              </div>
            )}
            {pendingConfirmations && !streaming && (
              <p className="mb-1.5 px-1 text-[11px] text-amber-700 dark:text-amber-300">
                Модель ждёт вашего решения по файлу — ответьте в карточке выше.
              </p>
            )}
            <form
              className={cn(celestia.chatComposer, 'items-end py-1.5')}
              onSubmit={(event) => {
                event.preventDefault();
                if (streaming) stop();
                else void send(input);
              }}
            >
              <textarea
                ref={inputRef}
                id="workspace-task-input"
                name="message"
                aria-label="Задача для рабочей папки"
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!streaming) void send(input);
                  }
                }}
                placeholder={
                  contextLimit
                    ? 'Память задачи заполнена — начните новую задачу'
                    : messages.length
                      ? 'Уточните или продолжите задачу…'
                      : 'Например: собери в notes.md конспект из всех PDF'
                }
                disabled={Boolean(contextLimit)}
                className={cn(celestia.chatComposerInput, 'max-h-[200px] px-2 py-1.5 leading-relaxed')}
              />
              <ContextUsageRing usage={usage} limitMessage={contextLimit?.message} streaming={streaming} />
              <button
                type="submit"
                disabled={!streaming && !canSend}
                className={celestia.sendButton}
                title={streaming ? 'Остановить' : 'Отправить (Enter)'}
                aria-label={streaming ? 'Остановить' : 'Отправить'}
              >
                {streaming ? <StopIcon /> : <SendIcon />}
              </button>
            </form>
          </div>
        </div>
      </section>

      {selectedPath && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 xl:hidden" onClick={closeFile} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border/60 bg-background shadow-2xl sm:w-[28rem] xl:relative xl:z-auto xl:w-[26rem] xl:shrink-0 xl:bg-transparent xl:shadow-none">
            <WorkspaceFilePanel
              key={selectedPath}
              path={selectedPath}
              entry={selectedEntry}
              file={file}
              loading={fileLoading}
              error={fileError}
              isDarkMode={isDarkMode}
              saving={saving}
              onClose={closeFile}
              onDownload={() => void downloadFile()}
              onDelete={() => void deleteFile()}
              onSave={saveFile}
              onMention={() => mentionFile(selectedPath)}
              onAsk={(ragSource) => navigate(`/rag?source=${encodeURIComponent(ragSource)}`)}
            />
          </aside>
        </>
      )}
    </div>
  );
};

export default WorkspacePage;

