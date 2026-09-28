import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Line, Legend, Area, AreaChart, ComposedChart,
} from 'recharts';
import { useRealBenchmark } from '../hooks/useRealBenchmark';
import { ChartContainer } from './ui/chart-container';
import { InlineError, InlineInfo } from './ui/inline-error';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';
import { inferenceSourceLabel } from '../utils/inferenceSnapshot';

interface BenchmarkingViewProps {
  isDarkMode: boolean;
  embedded?: boolean;
}

function formatNumber(num: number | null | undefined, decimals = 1): string {
  if (num === null || num === undefined || Number.isNaN(num) || !Number.isFinite(num)) return '—';
  return num.toFixed(decimals);
}

const BenchmarkingView: React.FC<BenchmarkingViewProps> = ({ isDarkMode = true, embedded = false }) => {
  const {
    gpus,
    inference,
    stats,
    history,
    isLoading,
    isPolling,
    error,
    lastUpdate,
    fetchData,
    togglePolling,
    clearHistory,
  } = useRealBenchmark({ autoPoll: true, pollingInterval: 5000 });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const gridColor = isDarkMode ? 'oklch(100% 0 0 / 12%)' : 'oklch(88% 0.014 260)';
  const textColor = isDarkMode ? 'oklch(68% 0.02 260)' : 'oklch(48% 0.025 260)';
  const tooltipBg = isDarkMode ? 'oklch(22% 0.025 260)' : 'oklch(99% 0.006 260)';
  const tooltipBorder = isDarkMode ? 'oklch(100% 0 0 / 14%)' : 'oklch(88% 0.014 260)';
  const tooltipText = isDarkMode ? 'oklch(94% 0.012 260)' : 'oklch(24% 0.025 260)';
  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: '8px',
  };

  const hasGpus = gpus.length > 0;
  const speedKnown = inference.available && (inference.genTps !== null || inference.promptTps !== null);
  const statusLabel = isPolling
    ? lastUpdate ? `Авто · ${lastUpdate}` : 'Автообновление'
    : lastUpdate ? `Пауза · ${lastUpdate}` : 'Пауза';

  const headerActions = (
    <div className={cn('flex flex-wrap items-center gap-1.5', embedded && 'ml-auto')}>
      {embedded && lastUpdate && (
        <span className="text-xs text-muted-foreground mr-1">{lastUpdate}</span>
      )}
      <button
        type="button"
        onClick={togglePolling}
        className={cn(
          'h-8 px-2.5 rounded-xl text-xs transition-colors',
          isPolling ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent',
        )}
      >
        Авто
      </button>
      <button
        type="button"
        onClick={() => void fetchData()}
        disabled={isLoading}
        className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
      >
        {isLoading ? '…' : 'Обновить'}
      </button>
      <button
        type="button"
        onClick={() => clearHistory()}
        className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        Очистить
      </button>
    </div>
  );

  const banners = (error || (isLoading && !hasGpus) || (!isLoading && !error && !hasGpus) || (inference.available && !speedKnown)) && (
    <div className="space-y-2 max-w-3xl">
      <InlineError message={error} />
      {error && (
        <button type="button" onClick={() => void fetchData()} className="text-sm font-medium text-primary hover:underline">
          Повторить попытку
        </button>
      )}
      {isLoading && !hasGpus && !error && (
        <InlineInfo message="Загрузка GET /api/monitoring/full..." />
      )}
      {!isLoading && !error && !hasGpus && (
        <InlineInfo message="Нет снимка GPU." />
      )}
      {!error && !inference.available && hasGpus && (
        <InlineInfo message="Модель не загружена: скорости инференса нет, показан только снимок карт." />
      )}
      {!error && inference.available && !speedKnown && (
        <InlineInfo message="Замера ещё не было. Скорости появятся после запроса к модели (чат или Inference Lab). Пока они null, а не 0." />
      )}
    </div>
  );

  const body = (
    <>
      {banners}
      {embedded && <div className="flex items-center justify-between gap-3">{headerActions}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-2">Генерация</div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(inference.genTps)} ток/с</div>
          <div className="text-xs text-muted-foreground mt-1">
            макс. за сессию {formatNumber(stats?.maxGenTps)}
          </div>
        </div>
        <div className="glass-panel border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-2">Промпт</div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(inference.promptTps)} ток/с</div>
          <div className="text-xs text-muted-foreground mt-1">
            среднее {formatNumber(stats?.avgPromptTps)}
          </div>
        </div>
        <div className="glass-panel border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-2">До первого токена</div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(inference.ttftMs, 0)} мс</div>
          <div className="text-xs text-muted-foreground mt-1">
            полный ответ {formatNumber(inference.latencyMs, 0)} мс
          </div>
        </div>
        <div className="glass-panel border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground mb-2">Модель</div>
          <div className="text-lg font-bold text-foreground truncate" title={inference.modelName ?? ''}>
            {inference.available ? (inference.modelName ?? inference.modelId ?? '—') : 'не загружена'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {[inference.precision, inference.contextSize ? `ctx ${inference.contextSize}` : null, inferenceSourceLabel(inference.source)]
              .filter(Boolean)
              .join(' · ') || (inference.running ? 'идёт генерация' : inference.idle ? 'простой' : '')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Скорость инференса</h3>
            <span className="text-sm text-muted-foreground">{history.length} замеров</span>
          </div>
          <ChartContainer height={288}>
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" stroke={textColor} fontSize={11} interval="preserveStartEnd" />
                <YAxis stroke={textColor} fontSize={11} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value, name) => [
                    formatNumber(Number(value)),
                    name === 'genTps' ? 'генерация, ток/с' : 'промпт, ток/с',
                  ]}
                />
                <Legend />
                <Area type="monotone" dataKey="genTps" name="Генерация" stroke="#3b82f6" fill="#3b82f633" strokeWidth={2} connectNulls={false} />
                <Area type="monotone" dataKey="promptTps" name="Промпт" stroke="#10b981" fill="#10b98133" strokeWidth={2} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Температура и мощность</h3>
            <span className="text-sm text-muted-foreground">{gpus.length} карт</span>
          </div>
          <ChartContainer height={288}>
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <ComposedChart data={gpus}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickFormatter={(value) => String(value).replace(/^NVIDIA GeForce /i, '')} />
                <YAxis yAxisId="left" stroke={textColor} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke={textColor} fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value, name) => {
                    if (name === 'temperature') return [`${formatNumber(Number(value))}°C`, 'Температура'];
                    if (name === 'powerDraw') return [`${formatNumber(Number(value))}W`, 'Мощность'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="temperature" name="Температура" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="powerDraw" name="Мощность" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-foreground mb-6">Видеопамять (GB)</h3>
          <ChartContainer height={256}>
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <BarChart data={gpus}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickFormatter={(value) => String(value).replace(/^NVIDIA GeForce /i, '')} />
                <YAxis stroke={textColor} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipText }} formatter={(value) => [formatNumber(Number(value), 2), 'GB']} />
                <Legend />
                <Bar dataKey="usedGb" name="Занято" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalGb" name="Всего" fill="#9ca3af" opacity={0.35} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-foreground mb-6">Утилизация GPU</h3>
          <ChartContainer height={256}>
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <BarChart data={gpus}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickFormatter={(value) => `GPU ${String(value).match(/GPU\s+(\d+)/)?.[1] ?? ''}`} />
                <YAxis stroke={textColor} fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipText }} formatter={(value) => [`${formatNumber(Number(value))}%`, 'Утилизация']} />
                <Bar dataKey="utilization" name="Утилизация %" radius={[4, 4, 0, 0]}>
                  {gpus.map((gpu, index) => (
                    <Cell key={gpu.key} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      <div className="glass-panel border border-border rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Карты (снимок nvidia-smi)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Номер карты — ключ gpu0 / gpu1, поля index нет. Скорость модели общая, не на карту.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background/50 dark:bg-muted/50 text-muted-foreground font-medium">
                <th className="px-6 py-4">Устройство</th>
                <th className="px-6 py-4">Утилизация</th>
                <th className="px-6 py-4">Память</th>
                <th className="px-6 py-4">Температура</th>
                <th className="px-6 py-4">Мощность</th>
                <th className="px-6 py-4">Вентилятор</th>
                <th className="px-6 py-4">Частота</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-border">
              {gpus.map((gpu) => {
                const share = gpu.totalGb > 0 ? Math.min(100, (gpu.usedGb / gpu.totalGb) * 100) : 0;
                return (
                  <tr key={gpu.key} className="hover:bg-background/50 dark:hover:bg-muted/30 bg-blue-50/50 dark:bg-blue-900/10">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>{gpu.name}</span>
                        <span className="px-2 py-0.5 bg-blue-500/10 text-primary text-xs rounded-full">{gpu.key}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-border dark:bg-muted rounded-full h-2">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${gpu.utilization}%` }} />
                        </div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">{formatNumber(gpu.utilization)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-border dark:bg-muted rounded-full h-2">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {formatNumber(gpu.usedGb, 2)} / {formatNumber(gpu.totalGb, 0)} GB
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatNumber(gpu.temperature, 0)}°C</td>
                    <td className="px-6 py-4 font-medium">{formatNumber(gpu.powerDraw, 0)}W</td>
                    <td className="px-6 py-4">{formatNumber(gpu.fanSpeed, 0)}%</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      <div>Память: {formatNumber(gpu.memoryClock, 0)}{gpu.memoryClockMax !== null ? ` / ${formatNumber(gpu.memoryClockMax, 0)}` : ''} MHz</div>
                      <div>Ядро: {formatNumber(gpu.coreClock, 0)}{gpu.coreClockMax !== null ? ` / ${formatNumber(gpu.coreClockMax, 0)}` : ''} MHz</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border surface-muted">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {stats
                ? `Замеров: ${stats.totalSamples} · карт: ${stats.activeDevices} · токенов промпта ${formatNumber(inference.tokensPrompt, 0)} · генерации ${formatNumber(inference.tokensGenerated, 0)}`
                : 'Загрузка данных...'}
            </div>
            <div className="flex items-center gap-2">
              <span>{isPolling ? 'Автообновление' : 'Пауза'}</span>
              <span>•</span>
              <span>Обновлено: {lastUpdate || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="w-full min-w-0 space-y-6 sm:space-y-8 animate-in fade-in duration-500">{body}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold text-foreground">Производительность</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">{statusLabel}</span>
          </div>
          {headerActions}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {body}
      </div>
    </div>
  );
};

export default BenchmarkingView;
