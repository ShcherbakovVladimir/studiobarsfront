import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import {
  ACTIVE_TABS,
  type ActiveTabType,
  type InferenceLabMode,
  type InferenceRequestRecord,
  type XLAMModel,
} from '../types';
import inferenceLabService from '../services/inferenceLabService';
import {
  deleteInferenceLabRequest,
  fetchInferenceLabAccess,
  fetchInferenceLabAnalytics,
  fetchInferenceLabRequest,
  fetchInferenceLabRequests,
} from '../store/inferenceLabSlice';
import {
  fetchAdapters,
  fetchActiveAdapter,
  loadAdapter,
  selectActiveAdapter,
  selectAllAdapters,
  unloadAdapter,
} from '../store/adaptersSlice';
import SettingsPanel from './SettingsPanel';
import { useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';
import { StatusPill } from './ui/status-pill';
import { EmptyState } from './ui/page-states';
import { SelectMenu } from './ui/select-menu';
import { fieldInputClass, fieldTextareaClass } from './ui/menu-popover';
import InferenceHistoryPanel from './inference-lab/InferenceHistoryPanel';
import InferenceAnalyticsPanel from './inference-lab/InferenceAnalyticsPanel';
import { formatMs, statusLabel, statusVariant } from './inference-lab/format';
import type { InferenceLabListParams } from '../services/inferenceLabService';

interface InferenceLabProps {
  selectedModel: XLAMModel | null;
}

const TAB_LABELS: Partial<Record<ActiveTabType, string>> = {
  inference: 'Прогон',
  history: 'История',
  analytics: 'Аналитика',
  settings: 'Параметры',
  adapters: 'Адаптеры',
};

const VISIBLE_TABS: ActiveTabType[] = [
  ACTIVE_TABS.INFERENCE,
  ACTIVE_TABS.HISTORY,
  ACTIVE_TABS.ANALYTICS,
  ACTIVE_TABS.SETTINGS,
  ACTIVE_TABS.ADAPTERS,
];

const InferenceLab: React.FC<InferenceLabProps> = ({ selectedModel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeTab, setActiveTab } = useWorkspacePanel(PANEL_IDS.INFERENCE_LAB, ACTIVE_TABS.INFERENCE);
  const activeTabId = (VISIBLE_TABS.includes(activeTab as ActiveTabType) ? activeTab : ACTIVE_TABS.INFERENCE) as ActiveTabType;

  const chatSettings = useSelector((state: RootState) => state.chat.settings);
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const adapters = useSelector(selectAllAdapters);
  const activeAdapter = useSelector(selectActiveAdapter);
  const lab = useSelector((state: RootState) => state.inferenceLab);

  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [mode, setMode] = useState<InferenceLabMode>('completion');
  const [stream, setStream] = useState(true);
  const [stopText, setStopText] = useState('');
  const [grammar, setGrammar] = useState('');
  const [jsonSchemaText, setJsonSchemaText] = useState('');
  const [output, setOutput] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<{
    requestId?: string;
    responseId?: string;
    status?: string;
    latencyMs?: number;
    ttftMs?: number;
    chunkCount?: number;
    tokens?: number;
  }>({});
  const [historyFilters, setHistoryFilters] = useState<InferenceLabListParams>({ page: 1, limit: 50 });
  const [analyticsDays, setAnalyticsDays] = useState(30);

  const abortRef = useRef<AbortController | null>(null);
  const generatingRef = useRef(false);

  useEffect(() => {
    void dispatch(fetchInferenceLabAccess());
    void dispatch(fetchAdapters());
    void dispatch(fetchActiveAdapter());
  }, [dispatch]);

  useEffect(() => {
    if (activeTabId === ACTIVE_TABS.HISTORY) {
      void dispatch(fetchInferenceLabRequests({ params: historyFilters }));
    }
    if (activeTabId === ACTIVE_TABS.ANALYTICS) {
      void dispatch(fetchInferenceLabAnalytics({ days: analyticsDays }));
    }
  }, [activeTabId, analyticsDays, dispatch, historyFilters]);

  useEffect(() => {
    const onPageHide = () => abortRef.current?.abort();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      abortRef.current?.abort();
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    generatingRef.current = false;
    setIsRunning(false);
    setMetrics((prev) => ({ ...prev, status: 'cancelled' }));
  };

  const handleRun = async () => {
    if (!prompt.trim() || generatingRef.current) return;
    generatingRef.current = true;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsRunning(true);
    setRunError(null);
    setOutput('');
    setMetrics({ status: 'streaming' });

    const stop = stopText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    let jsonSchema: Record<string, unknown> | null = null;
    if (jsonSchemaText.trim()) {
      try {
        const parsed: unknown = JSON.parse(jsonSchemaText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('json_schema должен быть объектом');
        }
        jsonSchema = parsed as Record<string, unknown>;
      } catch {
        generatingRef.current = false;
        setIsRunning(false);
        setRunError('json_schema: невалидный JSON');
        return;
      }
    }

    try {
      const result = await inferenceLabService.run(
        {
          mode,
          stream,
          prompt: prompt.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          messages:
            mode === 'chat'
              ? [
                  ...(systemPrompt.trim()
                    ? [{ role: 'system', content: systemPrompt.trim() }]
                    : []),
                  { role: 'user', content: prompt.trim() },
                ]
              : [],
          temperature: chatSettings.temperature,
          maxTokens: chatSettings.maxTokens,
          topP: chatSettings.topP,
          topK: (chatSettings as { topK?: number }).topK ?? 40,
          stop: stop.length ? stop : undefined,
          grammar: grammar || undefined,
          json_schema: jsonSchema,
        },
        {
          signal: abort.signal,
          streamHandlers: {
            onMeta: (frame) => {
              setMetrics((prev) => ({
                ...prev,
                requestId: frame.requestId,
                responseId: frame.responseId,
                status: 'streaming',
              }));
            },
            onToken: (_chunk, full) => setOutput(full),
            onDone: (frame, full) => {
              setOutput(full);
              const usage = frame.usage as
                | { totalTokens?: number; total_tokens?: number }
                | undefined;
              setMetrics({
                requestId: frame.requestId,
                status: frame.status ?? 'completed',
                latencyMs: frame.latencyMs,
                ttftMs: frame.ttftMs,
                chunkCount: frame.chunkCount,
                tokens: usage?.totalTokens ?? usage?.total_tokens,
              });
            },
            onError: (message) => setRunError(message),
          },
        }
      );

      if (!stream) {
        setOutput(result.text);
        setMetrics({
          requestId: result.request?.id,
          responseId: result.response?.id,
          status: result.response?.status ?? 'completed',
          latencyMs: result.response?.latencyMs,
          ttftMs: result.response?.ttftMs,
          chunkCount: result.response?.chunkCount,
          tokens: result.response?.usage?.totalTokens,
        });
      } else if (result.text && !output) {
        setOutput(result.text);
      }
      void dispatch(fetchInferenceLabRequests({ params: historyFilters }));
    } catch (error) {
      if (abort.signal.aborted) {
        setMetrics((prev) => ({ ...prev, status: 'cancelled' }));
      } else {
        setRunError(error instanceof Error ? error.message : 'Ошибка прогона');
        setMetrics((prev) => ({ ...prev, status: 'error' }));
      }
    } finally {
      generatingRef.current = false;
      setIsRunning(false);
      if (abortRef.current === abort) abortRef.current = null;
    }
  };

  const openPair = useCallback(
    async (id: string) => {
      try {
        const result = await dispatch(fetchInferenceLabRequest(id)).unwrap();
        const pair: InferenceRequestRecord = {
          ...result.request,
          response: result.response,
        };
        setPrompt(pair.prompt);
        setSystemPrompt(pair.systemPrompt ?? '');
        setMode(pair.mode);
        setStream(pair.stream);
        setOutput(pair.response?.text ?? pair.preview ?? '');
        setMetrics({
          requestId: pair.id,
          responseId: pair.response?.id,
          status: pair.response?.status,
          latencyMs: pair.response?.latencyMs,
          ttftMs: pair.response?.ttftMs,
          chunkCount: pair.response?.chunkCount,
          tokens: pair.response?.usage?.totalTokens,
        });
        setActiveTab(ACTIVE_TABS.INFERENCE);
      } catch {
        setRunError('Не удалось открыть прогон');
      }
    },
    [dispatch, setActiveTab]
  );

  if (lab.accessLoading && !lab.access) {
    return (
      <div className="flex h-full flex-col glass-panel text-foreground overflow-hidden">
        <header className={celestia.appHeader}>
          <h2 className="text-sm font-semibold">Лаборатория инференса</h2>
        </header>
        <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground">
          Проверка доступа…
        </div>
      </div>
    );
  }

  if (lab.access && !lab.access.allowed) {
    return (
      <div className="flex h-full flex-col glass-panel text-foreground overflow-hidden">
        <header className={celestia.appHeader}>
          <h2 className="text-sm font-semibold">Лаборатория инференса</h2>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            message={
              lab.access.userBlocked
                ? 'Лаборатория инференса отключена для этой учётной записи. Снять запрет может только администратор.'
                : lab.access.adminOnly
                  ? 'Лаборатория инференса доступна только администраторам.'
                  : lab.access.reason || 'Лаборатория инференса недоступна.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col glass-panel text-foreground overflow-hidden">
      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold">Лаборатория инференса</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
              {selectedModel?.name || 'Модель не выбрана'}
            </span>
            {activeAdapter && (
              <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[10rem]">
                {activeAdapter.name}
              </span>
            )}
          </div>
          <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit">
            {VISIBLE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={activeTabId === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-2.5 h-7 rounded-lg text-xs transition-colors',
                  activeTabId === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-border/80'
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeTabId === ACTIVE_TABS.INFERENCE && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-accent rounded-xl p-0.5">
              {(['completion', 'chat'] as InferenceLabMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    'px-2.5 h-7 rounded-lg text-xs',
                    mode === item ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={stream} onChange={(event) => setStream(event.target.checked)} />
              SSE-стрим
            </label>
            <SelectMenu
              value={grammar}
              onChange={setGrammar}
              aria-label="Grammar"
              className="w-[11.5rem]"
              options={[
                { value: '', label: 'без grammar' },
                { value: 'json', label: 'grammar: json' },
                { value: 'list', label: 'grammar: list' },
                { value: 'json_arr', label: 'grammar: json_arr' },
              ]}
            />
            <input
              value={stopText}
              onChange={(event) => setStopText(event.target.value)}
              placeholder="stop: \\n, ###"
              className={cn(fieldInputClass, 'w-44')}
            />
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">json_schema (необязательно, приоритетнее grammar)</span>
            <textarea
              value={jsonSchemaText}
              onChange={(event) => setJsonSchemaText(event.target.value)}
              rows={3}
              placeholder='{"type":"object","properties":{"ok":{"type":"boolean"}}}'
              className={cn(fieldTextareaClass, 'mt-1 text-xs font-mono min-h-[4.5rem]')}
            />
          </label>

          {mode === 'chat' && (
            <label className="block">
              <span className="text-xs text-muted-foreground">systemPrompt</span>
              <textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                rows={2}
                className={cn(fieldTextareaClass, 'mt-1 min-h-[3rem]')}
              />
            </label>
          )}

          <section className="rounded-2xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Запрос</h3>
              <span className="text-[11px] text-muted-foreground">inference_requests</span>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={isRunning}
              rows={6}
              placeholder="Промпт для одного прогона — не чат"
              className={cn(fieldTextareaClass, 'min-h-[8rem]')}
            />
            <div className="flex justify-end gap-2">
              {isRunning ? (
                <button type="button" onClick={handleStop} className={celestia.chatComposerStop}>
                  Стоп
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRun()}
                  disabled={!prompt.trim()}
                  className="h-8 px-3 rounded-xl text-xs btn-gradient text-white disabled:opacity-40"
                >
                  Запустить
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">Ответ</h3>
              <span className="text-[11px] text-muted-foreground">inference_responses</span>
              {metrics.status && (
                <StatusPill variant={statusVariant(metrics.status)}>{statusLabel(metrics.status)}</StatusPill>
              )}
              <span className="text-[11px] text-muted-foreground ml-auto">
                latency {formatMs(metrics.latencyMs)} · ttft {formatMs(metrics.ttftMs)}
                {metrics.chunkCount != null ? ` · ${metrics.chunkCount} кадр.` : ''}
                {metrics.tokens != null ? ` · ${metrics.tokens} ток.` : ''}
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm min-h-[8rem] font-mono">
              {output || (isRunning ? 'Ожидание первого токена…' : 'Ответ появится после прогона.')}
            </pre>
            {runError && <p className="text-xs text-destructive">{runError}</p>}
            {metrics.requestId && (
              <p className="text-[11px] font-mono text-muted-foreground">request {metrics.requestId}</p>
            )}
          </section>
        </div>
      )}

      {activeTabId === ACTIVE_TABS.HISTORY && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <InferenceHistoryPanel
            items={lab.requests.items}
            total={lab.requests.total}
            page={lab.requests.page}
            limit={lab.requests.limit}
            loading={lab.historyLoading}
            error={lab.historyError}
            selectedId={lab.selected?.id}
            onSelect={(id) => void openPair(id)}
            onDelete={(id) => void dispatch(deleteInferenceLabRequest(id))}
            onPageChange={(page) => setHistoryFilters((prev) => ({ ...prev, page }))}
            onFilterChange={(filters) => setHistoryFilters((prev) => ({ ...prev, ...filters, page: 1 }))}
          />
        </div>
      )}

      {activeTabId === ACTIVE_TABS.ANALYTICS && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <InferenceAnalyticsPanel
            analytics={lab.analytics}
            loading={lab.analyticsLoading}
            error={lab.analyticsError}
            days={analyticsDays}
            onDaysChange={setAnalyticsDays}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {activeTabId === ACTIVE_TABS.SETTINGS && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <div className={celestia.chatColumn}>
            <SettingsPanel />
          </div>
        </div>
      )}

      {activeTabId === ACTIVE_TABS.ADAPTERS && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <div className={celestia.chatColumn}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Адаптеры</h3>
              <button
                type="button"
                onClick={() => dispatch(fetchAdapters())}
                className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent"
              >
                Обновить
              </button>
            </div>
            {adapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Адаптеры не найдены.</p>
            ) : (
              <div className="space-y-2">
                {adapters.map((adapter) => (
                  <div key={adapter.id} className="p-3 rounded-2xl border border-border flex justify-between items-center">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{adapter.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {adapter.type} • {adapter.size}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeAdapter?.id === adapter.id) dispatch(unloadAdapter());
                        else dispatch(loadAdapter({ adapterId: adapter.id, modelId: selectedModel?.id }));
                      }}
                      className="ml-2 h-8 px-2.5 rounded-xl text-xs hover:bg-accent"
                    >
                      {activeAdapter?.id === adapter.id ? 'Выгрузить' : 'Загрузить'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InferenceLab;
