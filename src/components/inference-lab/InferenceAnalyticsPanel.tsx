import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InferenceLabAnalytics } from '../../types';
import { ChartContainer } from '../ui/chart-container';
import { EmptyState, LoadingState } from '../ui/page-states';
import { MetricCard } from '../ui/metric-card';
import { SelectMenu } from '../ui/select-menu';
import { fieldInputClass } from '../ui/menu-popover';
import { cn } from '../../lib/utils';
import { formatMs, formatRate } from './format';

interface InferenceAnalyticsPanelProps {
  analytics: InferenceLabAnalytics | null;
  loading: boolean;
  error: string | null;
  days: number;
  onDaysChange: (days: number) => void;
  isDarkMode: boolean;
  userFilter?: string;
  onUserFilterChange?: (userId: string) => void;
}

const DAY_OPTIONS = [7, 14, 30, 90];

const InferenceAnalyticsPanel: React.FC<InferenceAnalyticsPanelProps> = ({
  analytics,
  loading,
  error,
  days,
  onDaysChange,
  isDarkMode,
  userFilter,
  onUserFilterChange,
}) => {
  const [localUser, setLocalUser] = useState(userFilter ?? '');
  const gridColor = isDarkMode ? 'oklch(100% 0 0 / 12%)' : 'oklch(88% 0.014 260)';
  const textColor = isDarkMode ? 'oklch(68% 0.02 260)' : 'oklch(48% 0.025 260)';

  const summary = analytics?.summary;
  const modeRows = useMemo(
    () =>
      (analytics?.byMode ?? []).map((row) => ({
        ...row,
        label: `${row.mode}${row.stream ? ' · stream' : ''}`,
      })),
    [analytics]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SelectMenu
          value={String(days)}
          onChange={(value) => onDaysChange(Number(value))}
          aria-label="Период"
          className="w-[8.5rem]"
          options={DAY_OPTIONS.map((option) => ({
            value: String(option),
            label: `${option} дн.`,
          }))}
        />
        {onUserFilterChange && (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              onUserFilterChange(localUser.trim());
            }}
          >
            <input
              value={localUser}
              onChange={(event) => setLocalUser(event.target.value)}
              placeholder="userId"
              className={cn(fieldInputClass, 'w-44')}
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-xl text-xs text-muted-foreground hover:bg-accent"
            >
              Фильтр
            </button>
          </form>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !analytics && <LoadingState message="Загрузка аналитики…" />}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Прогоны" value={summary.requests} />
          <MetricCard label="Успех" value={formatRate(summary.successRate)} />
          <MetricCard label="Ошибки" value={formatRate(summary.errorRate)} />
          <MetricCard label="Стрим" value={summary.streamed} />
          <MetricCard label="Средняя latency" value={formatMs(summary.avgLatencyMs)} />
          <MetricCard label="p50 / p95" value={`${formatMs(summary.p50LatencyMs)} / ${formatMs(summary.p95LatencyMs)}`} />
          <MetricCard label="TTFT" value={formatMs(summary.avgTtftMs)} />
          <MetricCard
            label="Токены"
            value={summary.totalTokens ?? (summary.promptTokens ?? 0) + (summary.completionTokens ?? 0)}
          />
        </div>
      )}

      {!loading && analytics && analytics.summary.requests === 0 && (
        <EmptyState message="Пока нет прогонов за выбранный период." />
      )}

      {analytics && analytics.byDay.length > 0 && (
        <div className="rounded-2xl border border-border/60 p-3">
          <h3 className="text-sm font-medium mb-2">По дням</h3>
          <ChartContainer height={220}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.byDay}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 11 }} />
                <YAxis tick={{ fill: textColor, fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="requests" name="запросы" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="errors" name="ошибки" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {analytics && analytics.byModel.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-3">
            <h3 className="text-sm font-medium mb-2">По моделям</h3>
            <ChartContainer height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byModel}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="model" tick={{ fill: textColor, fontSize: 10 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="requests" name="прогоны" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
        {modeRows.length > 0 && (
          <div className="rounded-2xl border border-border/60 p-3">
            <h3 className="text-sm font-medium mb-2">По режиму</h3>
            <ChartContainer height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modeRows}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="requests" name="прогоны" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </div>

      {analytics?.byUser && analytics.byUser.length > 0 && (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <h3 className="text-sm font-medium px-3 py-2 border-b border-border">По пользователям</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Пользователь</th>
                <th className="px-3 py-2">Прогоны</th>
              </tr>
            </thead>
            <tbody>
              {analytics.byUser.map((row) => (
                <tr key={row.userId} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{row.email || row.userId}</td>
                  <td className="px-3 py-2">{row.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InferenceAnalyticsPanel;
