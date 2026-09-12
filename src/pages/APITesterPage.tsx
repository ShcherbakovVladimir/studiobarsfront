import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { confirmDialog } from '../services/dialogService';
import {
  CATEGORY_LABELS,
  defaultBodyText,
  defaultPathParams,
  defaultQuery,
  fetchApiCatalog,
  getCategoryLabel,
  isSafeToAutoTest,
  runEndpointTest,
  type ApiCatalog,
  type ApiEndpoint,
  type EndpointTestResult,
  type HttpMethod,
} from '../services/apiCatalogService';
import {
  AlertBanner,
  EmptyState,
  FormInput,
  LoadingState,
  MetricCard,
  ResultPanel,
  StatusPill,
} from '../components/ui';
import { IconButton } from '../components/ui/icon-button';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[3.5rem] px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-accent text-muted-foreground">
      {method}
    </span>
  );
}

const METHOD_FILTERS: Array<HttpMethod | 'all'> = [
  'all',
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
];

interface EndpointDraft {
  pathParams: Record<string, string>;
  query: Record<string, string>;
  bodyText: string;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} с` : `${ms} мс`;
}

function stringifyResult(result: EndpointTestResult): string {
  if (result.error && result.data === undefined) return result.error;
  try {
    return JSON.stringify(result.data ?? result.error, null, 2);
  } catch {
    return String(result.data ?? result.error);
  }
}

const EndpointCard: React.FC<{
  endpoint: ApiEndpoint;
  result?: EndpointTestResult;
  running: boolean;
  expanded: boolean;
  draft: EndpointDraft;
  onToggle: () => void;
  onDraftChange: (draft: EndpointDraft) => void;
  onRun: () => void;
}> = ({ endpoint, result, running, expanded, draft, onToggle, onDraftChange, onRun }) => {
  const hasBody = endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.method !== 'OPTIONS';
  const queryEntries = Object.entries(draft.query);
  const showQuery = endpoint.queryKeys.length > 0 || queryEntries.length > 0;

  return (
    <article className="rounded-xl border border-border glass-panel shadow-sm overflow-hidden min-w-0">
      <div className="grid grid-cols-1 min-[480px]:grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 sm:p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-start gap-2 min-w-0 text-left"
        >
          <ChevronDown
            className={cn(
              'w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )}
          />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method={endpoint.method} />
              <code className="text-[11px] sm:text-sm font-mono break-all text-foreground">
                {endpoint.path}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill variant="neutral">{getCategoryLabel(endpoint.category)}</StatusPill>
              {endpoint.mutating && (
                <StatusPill variant="warning">изменяющий</StatusPill>
              )}
              {endpoint.auth === true && <StatusPill variant="info">auth</StatusPill>}
              {result && (
                <StatusPill variant={result.success ? 'success' : 'error'}>
                  {result.success ? 'OK' : 'ошибка'}
                  {result.status != null ? ` ${result.status}` : ''}
                </StatusPill>
              )}
            </div>
            {endpoint.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {endpoint.description}
              </p>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 w-full min-[480px]:w-auto self-start"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Тест
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 sm:p-4 space-y-3 bg-background/50/80 dark:bg-background/40">
          {endpoint.pathParams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {endpoint.pathParams.map((name) => (
                <label key={name} className="block min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground mb-1">:{name}</span>
                  <FormInput
                    value={draft.pathParams[name] ?? ''}
                    onChange={(e) =>
                      onDraftChange({
                        ...draft,
                        pathParams: { ...draft.pathParams, [name]: e.target.value },
                      })
                    }
                    placeholder={name}
                  />
                </label>
              ))}
            </div>
          )}

          {showQuery && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(endpoint.queryKeys.length > 0 ? endpoint.queryKeys : Object.keys(draft.query)).map(
                (name) => (
                  <label key={name} className="block min-w-0">
                    <span className="block text-xs font-medium text-muted-foreground mb-1">query.{name}</span>
                    <FormInput
                      value={draft.query[name] ?? ''}
                      onChange={(e) =>
                        onDraftChange({
                          ...draft,
                          query: { ...draft.query, [name]: e.target.value },
                        })
                      }
                      placeholder={name}
                    />
                  </label>
                )
              )}
            </div>
          )}

          {hasBody && (
            <label htmlFor={`api-tester-body-${endpoint.id}`} className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1">JSON body</span>
              <textarea
                id={`api-tester-body-${endpoint.id}`}
                name="bodyText"
                value={draft.bodyText}
                onChange={(e) => onDraftChange({ ...draft, bodyText: e.target.value })}
                spellCheck={false}
                rows={8}
                className="w-full min-h-[8rem] rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
          )}

          {result && (
            <ResultPanel
              success={result.success}
              title={
                result.success
                  ? `Успешно${result.status != null ? ` · ${result.status}` : ''} · ${formatDuration(result.durationMs)}`
                  : result.error || 'Ошибка'
              }
              error={result.success ? null : result.error}
            >
              <pre className="mt-2 max-h-64 overflow-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all surface-elevated p-2 rounded-xl">
                {stringifyResult(result)}
              </pre>
            </ResultPanel>
          )}
        </div>
      )}
    </article>
  );
};

const APITesterPage: React.FC<{ embedded?: boolean }> = () => {
  const [catalog, setCatalog] = useState<ApiCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'all'>('all');
  const [safeOnly, setSafeOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, EndpointDraft>>({});
  const [results, setResults] = useState<Record<string, EndpointTestResult>>({});
  const [runningIds, setRunningIds] = useState<Record<string, boolean>>({});
  const [bulkRunning, setBulkRunning] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const next = await fetchApiCatalog();
      setCatalog(next);
      setDrafts((prev) => {
        const merged = { ...prev };
        for (const endpoint of next.endpoints) {
          if (!merged[endpoint.id]) {
            merged[endpoint.id] = {
              pathParams: defaultPathParams(endpoint),
              query: defaultQuery(endpoint),
              bodyText: defaultBodyText(endpoint),
            };
          }
        }
        return merged;
      });
    } catch (error) {
      setCatalog(null);
      setCatalogError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const categories = useMemo(() => {
    const present = new Set(catalog?.endpoints.map((item) => item.category) ?? []);
    return ['all', ...Object.keys(CATEGORY_LABELS).filter((key) => key !== 'all' && present.has(key))];
  }, [catalog]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (catalog?.endpoints ?? []).filter((endpoint) => {
      if (category !== 'all' && endpoint.category !== category) return false;
      if (methodFilter !== 'all' && endpoint.method !== methodFilter) return false;
      if (safeOnly && !isSafeToAutoTest(endpoint)) return false;
      if (!query) return true;
      return (
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.method.toLowerCase().includes(query) ||
        endpoint.name.toLowerCase().includes(query) ||
        (endpoint.description ?? '').toLowerCase().includes(query) ||
        getCategoryLabel(endpoint.category).toLowerCase().includes(query)
      );
    });
  }, [catalog, category, methodFilter, safeOnly, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ApiEndpoint[]>();
    for (const endpoint of filtered) {
      const list = map.get(endpoint.category) ?? [];
      list.push(endpoint);
      map.set(endpoint.category, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const stats = useMemo(() => {
    const tested = Object.values(results);
    const successful = tested.filter((item) => item.success).length;
    return {
      catalog: catalog?.endpoints.length ?? 0,
      visible: filtered.length,
      tested: tested.length,
      successful,
      failed: tested.length - successful,
    };
  }, [catalog, filtered.length, results]);

  const ensureDraft = useCallback((endpoint: ApiEndpoint): EndpointDraft => {
    return (
      drafts[endpoint.id] ?? {
        pathParams: defaultPathParams(endpoint),
        query: defaultQuery(endpoint),
        bodyText: defaultBodyText(endpoint),
      }
    );
  }, [drafts]);

  const runOne = useCallback(async (endpoint: ApiEndpoint) => {
    if (endpoint.mutating) {
      const confirmed = await confirmDialog({
        title: `Запустить ${endpoint.method} ${endpoint.path}?`,
        description: 'Этот эндпоинт может изменить состояние сервера (модель, сессии, обучение).',
        confirmLabel: 'Запустить',
        destructive: endpoint.method === 'DELETE',
      });
      if (!confirmed) return;
    }

    setExpandedIds((prev) => ({ ...prev, [endpoint.id]: true }));
    setRunningIds((prev) => ({ ...prev, [endpoint.id]: true }));
    const draft = ensureDraft(endpoint);
    const result = await runEndpointTest(endpoint, {
      pathParams: draft.pathParams,
      query: draft.query,
      bodyText: draft.bodyText,
    });
    setResults((prev) => ({ ...prev, [endpoint.id]: result }));
    setRunningIds((prev) => {
      const next = { ...prev };
      delete next[endpoint.id];
      return next;
    });
  }, [ensureDraft]);

  const runSafeBatch = useCallback(async () => {
    const queue = filtered.filter(isSafeToAutoTest);
    if (queue.length === 0) return;
    setBulkRunning(true);
    for (const endpoint of queue) {
      setRunningIds((prev) => ({ ...prev, [endpoint.id]: true }));
      const draft = ensureDraft(endpoint);
      const result = await runEndpointTest(endpoint, {
        pathParams: draft.pathParams,
        query: draft.query,
        bodyText: draft.bodyText,
      });
      setResults((prev) => ({ ...prev, [endpoint.id]: result }));
      setRunningIds((prev) => {
        const next = { ...prev };
        delete next[endpoint.id];
        return next;
      });
    }
    setBulkRunning(false);
  }, [ensureDraft, filtered]);

  const safeCount = filtered.filter(isSafeToAutoTest).length;

  const filterChip = (active: boolean) =>
    cn(
      'px-2.5 h-7 rounded-lg text-xs transition-colors shrink-0',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-border/80'
    );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold text-foreground">Тестирование API</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={catalog?.baseUrl}>
              {catalog?.baseUrl ?? 'GET /api'}
              {catalog?.version ? ` · v${catalog.version}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">
              {stats.visible}/{stats.catalog}
            </span>
            <IconButton
              label="Обновить каталог"
              onClick={() => void loadCatalog()}
              disabled={loadingCatalog}
              className="h-8 w-8"
            >
              {loadingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </IconButton>
            <button
              type="button"
              onClick={() => void runSafeBatch()}
              disabled={bulkRunning || loadingCatalog || safeCount === 0}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
              title="Запустить безопасные GET"
            >
              {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              GET ({safeCount})
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <MetricCard label="В каталоге" value={stats.catalog} />
        <MetricCard label="На экране" value={stats.visible} />
        <MetricCard label="Успешных" value={stats.successful} />
        <MetricCard label="Ошибок" value={stats.failed} />
      </div>

      <div className="mb-4 space-y-3 min-w-0">
        <div className="relative min-w-0">
          <label htmlFor="api-tester-search" className="sr-only">
            Поиск по пути, методу, описанию
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <FormInput
            id="api-tester-search"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по пути, методу, описанию"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-accent rounded-xl p-0.5 max-w-full overflow-x-auto">
            {METHOD_FILTERS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setMethodFilter(method)}
                className={filterChip(methodFilter === method)}
              >
                {method === 'all' ? 'Все' : method}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSafeOnly((value) => !value)}
            className={cn(
              'h-8 px-2.5 rounded-xl text-xs inline-flex items-center gap-1 transition-colors',
              safeOnly ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Безопасные
          </button>
        </div>

        <div className="flex flex-wrap items-center bg-accent rounded-xl p-0.5 w-fit max-w-full">
          {categories.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={filterChip(category === key)}
            >
              {getCategoryLabel(key)}
            </button>
          ))}
        </div>
      </div>

      {catalogError && (
        <AlertBanner variant="error" className="mb-4" message={catalogError} />
      )}

      {loadingCatalog && <LoadingState message="Загрузка каталога GET /api..." />}

      {!loadingCatalog && !catalogError && filtered.length === 0 && (
        <EmptyState
          message={
            catalog && catalog.endpoints.length === 0
              ? 'GET /api ответил, но список эндпоинтов разобрать не удалось. Проверьте формат каталога.'
              : 'Нет эндпоинтов по текущим фильтрам.'
          }
        />
      )}

      <div className="space-y-6">
        {grouped.map(([group, endpoints]) => (
          <section key={group} className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {getCategoryLabel(group)}
              </h3>
              <span className="text-xs text-muted-foreground">{endpoints.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {endpoints.map((endpoint) => (
                <EndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  result={results[endpoint.id]}
                  running={Boolean(runningIds[endpoint.id])}
                  expanded={Boolean(expandedIds[endpoint.id])}
                  draft={ensureDraft(endpoint)}
                  onToggle={() =>
                    setExpandedIds((prev) => ({ ...prev, [endpoint.id]: !prev[endpoint.id] }))
                  }
                  onDraftChange={(draft) =>
                    setDrafts((prev) => ({ ...prev, [endpoint.id]: draft }))
                  }
                  onRun={() => void runOne(endpoint)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
};

export default APITesterPage;
