// /home/user/projects/studioxlam/src/components/HardwareMonitor.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent } from './ui/tabs';
import { 
  Cpu, MemoryStick, HardDrive, 
  RefreshCw, AlertCircle, 
  Server, Database
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import monitoringService, { type MonitoringFullData } from '../services/monitoringService';
import { ChartContainer } from './ui/chart-container';
import { InlineError } from './ui/alert-banner';
import { EmptyState } from './ui/page-states';
import { StatusRow } from './ui/status-row';
import { getUsageTone, usageTextClass } from './ui/metric-utils';
import { GpuMonitorCard } from './ui/gpu-monitor-card';
import { listGpus } from '../utils/gpuUtils';
import { IconButton } from './ui/icon-button';
import { cn } from '../lib/utils';

type HardwareData = MonitoringFullData;

type GpuHistoryPoint = {
  time: string;
  temp: number;
  usage: number;
  power: number;
};

interface GpuHistoryChartProps {
  gpuIndex: number;
  history: GpuHistoryPoint[];
  isActive: boolean;
}

function GpuHistoryChart({ gpuIndex, history, isActive }: GpuHistoryChartProps) {
  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle>GPU {gpuIndex} - История температуры и загрузки</CardTitle>
        <CardDescription>
          За последние {history.length} записей
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {isActive && (
          <ChartContainer height={280} className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="temp"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  label={{ value: '°C', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="usage"
                  orientation="right"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  domain={[0, 100]}
                  label={{ value: '%', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Температура (°C)"
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="usage"
                  type="monotone"
                  dataKey="usage"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Загрузка (%)"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function HardwareMonitor({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<HardwareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [cpuHistory, setCpuHistory] = useState<Array<{time: string, value: number}>>([]);
  const [memoryHistory, setMemoryHistory] = useState<Array<{time: string, value: number}>>([]);
  const [gpuHistories, setGpuHistories] = useState<Record<string, GpuHistoryPoint[]>>({});
  const [historyTab, setHistoryTab] = useState('cpu');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await monitoringService.getFull();
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }

      setData(result);
      setLastUpdated(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));

      // Обновляем историю данных
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // CPU история
      if (result.system?.cpuUsage !== undefined) {
        setCpuHistory(prev => {
          const newHistory = [...prev, { time: timeStr, value: result.system.cpuUsage }];
          return newHistory.slice(-20); // Храним последние 20 записей
        });
      }
      
      // Memory история
      if (result.system?.memoryUsage !== undefined) {
        setMemoryHistory(prev => {
          const newHistory = [...prev, { time: timeStr, value: result.system.memoryUsage }];
          return newHistory.slice(-20);
        });
      }
      
      listGpus(result.gpu).forEach(({ key, stat }) => {
        setGpuHistories((prev) => {
          const nextPoint: GpuHistoryPoint = {
            time: timeStr,
            temp: stat.temperature ?? 0,
            usage: stat.utilization ?? 0,
            power: stat.powerDraw ?? stat.power ?? 0,
          };
          const current = prev[key] ?? [];
          return {
            ...prev,
            [key]: [...current, nextPoint].slice(-20),
          };
        });
      });

    } catch (err) {
      console.error('Error fetching hardware stats:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefreshing(prev => !prev);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout> | null = null;

    if (isAutoRefreshing) {
      intervalId = setInterval(fetchData, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshing]);

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (usage: number): string => usageTextClass(getUsageTone(usage));

  const gpuList = listGpus(data?.gpu);
  const gpuWarnings = gpuList.filter(({ stat }) => (stat.temperature ?? 0) > 75);
  const hasSystemWarnings =
    gpuWarnings.length > 0 ||
    (data?.system?.memoryUsage ?? 0) > 85 ||
    (data?.system?.diskUsage ?? 0) > 90;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <InlineError message={error} className="mb-4" />
          <EmptyState
            message="Не удалось загрузить данные мониторинга"
            action={
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Повторить попытку
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (!data && isLoading) {
    return (
      <div className="w-full min-w-0 space-y-4">
        {!embedded && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Мониторинг</h2>
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-border dark:bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-border dark:bg-muted animate-pulse mb-2" />
                <div className="h-2 w-full rounded bg-border dark:bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Заголовок и управление */}
      <div className={cn('flex items-center justify-between gap-3', !embedded && 'flex-col xl:flex-row xl:items-start')}>
        {!embedded && (
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">Мониторинг</h2>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground mr-1">
              {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={toggleAutoRefresh}
            className={cn(
              'h-8 px-2.5 rounded-xl text-xs transition-colors',
              isAutoRefreshing
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
            title={isAutoRefreshing ? 'Автообновление включено' : 'Включить автообновление'}
          >
            Авто
          </button>
          <IconButton
            label="Обновить"
            onClick={() => void fetchData()}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </IconButton>
        </div>
      </div>

      {/* Основные метрики системы */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm font-medium">
                <Cpu className="mr-2 h-4 w-4" />
                Процессор
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {data?.system?.cpuUsage || 0}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${getStatusColor(data?.system?.cpuUsage || 0)}`}>
                {data?.system?.cpuUsage || 0}%
              </div>
              <Progress value={data?.system?.cpuUsage || 0} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data?.system?.uptime || 'Время работы не доступно'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Память */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <MemoryStick className="mr-2 h-4 w-4" />
              Оперативная память
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${getStatusColor(data?.system?.memoryUsage || 0)}`}>
                  {data?.system?.memoryUsage || 0}%
                </div>
                <Badge variant="outline" className="text-xs">
                  {data?.system?.usedMemory || '0'} / {data?.system?.totalMemory || '0'}
                </Badge>
              </div>
              <Progress value={data?.system?.memoryUsage || 0} className="h-2" />
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Использовано: {data?.system?.usedMemory || '0'}</span>
                <span>Свободно: {data?.system?.freeMemory || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Диск */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <HardDrive className="mr-2 h-4 w-4" />
              Дисковое пространство
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${getStatusColor(data?.system?.diskUsage || 0)}`}>
                  {data?.system?.diskUsage || 0}%
                </div>
                <Badge variant="outline" className="text-xs">
                  {data?.system?.diskUsage || 0}%
                </Badge>
              </div>
              <Progress value={data?.system?.diskUsage || 0} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {data?.system?.diskUsage ? `Использовано ${data.system.diskUsage}%` : 'Нет данных'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Сервер */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <Server className="mr-2 h-4 w-4" />
              Сервер Node.js
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {data?.server?.uptime ? `${Math.floor(data.server.uptime / 3600)}ч` : '—'}
                </div>
                <Badge variant="outline" className="text-xs">
                  v{data?.server?.version || '?'}
                </Badge>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heap:</span>
                  <span>{data?.server?.memory ? formatBytes(data.server.memory.heapUsed) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RSS:</span>
                  <span>{data?.server?.memory ? formatBytes(data.server.memory.rss) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">External:</span>
                  <span>{data?.server?.memory ? formatBytes(data.server.memory.external) : '—'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPU Мониторинг */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {gpuList.map(({ key, index, stat }) => (
          <GpuMonitorCard key={key} gpuKey={key} gpuIndex={index} stat={stat} />
        ))}
      </div>

      {/* Графики истории */}
      <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full min-w-0 space-y-4">
        <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            aria-pressed={historyTab === 'cpu'}
            onClick={() => setHistoryTab('cpu')}
            className={cn(
              'px-2.5 h-7 rounded-lg text-xs transition-colors shrink-0',
              historyTab === 'cpu'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-border/80'
            )}
          >
            CPU
          </button>
          <button
            type="button"
            aria-pressed={historyTab === 'memory'}
            onClick={() => setHistoryTab('memory')}
            className={cn(
              'px-2.5 h-7 rounded-lg text-xs transition-colors shrink-0',
              historyTab === 'memory'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-border/80'
            )}
          >
            Память
          </button>
          {gpuList.map(({ key, index }) => (
            <button
              key={key}
              type="button"
              aria-pressed={historyTab === key}
              onClick={() => setHistoryTab(key)}
              className={cn(
                'px-2.5 h-7 rounded-lg text-xs transition-colors shrink-0',
                historyTab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-border/80'
              )}
            >
              GPU {index}
            </button>
          ))}
        </div>
        
        <TabsContent value="cpu" className="space-y-4 mt-0">
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle>История использования CPU</CardTitle>
              <CardDescription>
                За последние {cpuHistory.length} записей
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {historyTab === 'cpu' && (
              <ChartContainer height={280} className="w-full min-w-0">
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <AreaChart data={cpuHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      domain={[0, 100]}
                      label={{ value: '%', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value}%`, 'Использование CPU']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Использование CPU"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="memory" className="space-y-4 mt-0">
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle>История использования памяти</CardTitle>
              <CardDescription>
                За последние {memoryHistory.length} записей
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {historyTab === 'memory' && (
              <ChartContainer height={280} className="w-full min-w-0">
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <AreaChart data={memoryHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      domain={[0, 100]}
                      label={{ value: '%', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value}%`, 'Использование памяти']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Использование памяти"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {gpuList.map(({ key, index }) => (
          <TabsContent key={key} value={key} className="space-y-4 mt-0">
            <GpuHistoryChart
              gpuIndex={index}
              history={gpuHistories[key] ?? []}
              isActive={historyTab === key}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Статус тренировок */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Активные тренировки</span>
            <Badge variant="outline">
              {data?.training?.total || 0} активных
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.training?.sessions || data.training.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Активные тренировки отсутствуют</p>
              <p className="text-sm mt-2">Запустите процесс дообучения, чтобы увидеть данные здесь</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.training.sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                      <div className="font-medium truncate max-w-full">{session.sessionId}</div>
                      <Badge variant="outline" className="shrink-0">{session.status}</Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Прогресс: {session.progress}% • Запущено: {new Date(session.startTime).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xs sm:text-sm font-medium">
                      {listGpus(session.gpuStats).length > 0
                        ? listGpus(session.gpuStats)
                            .map(({ index, stat }) => `${stat.utilization ?? 0}% GPU${index}`)
                            .join(' · ')
                        : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Системные предупреждения */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Системные предупреждения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gpuWarnings.map(({ key, index, stat }) => (
                <StatusRow
                  key={key}
                  variant="error"
                  title={`Высокая температура GPU ${index}`}
                  description={`Температура ${stat.temperature}°C превышает рекомендуемый предел`}
                />
              ))}

              {data.system?.memoryUsage && data.system.memoryUsage > 85 && (
                <StatusRow
                  variant="warning"
                  title="Высокое использование памяти"
                  description={`${data.system.memoryUsage}% памяти системы используется`}
                />
              )}

              {data.system?.diskUsage && data.system.diskUsage > 90 && (
                <StatusRow
                  variant="error"
                  title="Мало места на диске"
                  description={`Осталось только ${100 - data.system.diskUsage}% свободного места`}
                />
              )}

              {!hasSystemWarnings && (
                <StatusRow
                  variant="success"
                  title="Все системы работают нормально"
                  description="Температура, память и диск в пределах нормы"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}