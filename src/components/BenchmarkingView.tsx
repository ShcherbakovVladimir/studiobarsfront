// /home/user/projects/studioxlam/src/components/BenchmarkingView.tsx
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Line, Legend, Area, AreaChart, 
  ComposedChart
} from 'recharts';
import { useRealBenchmark } from '../hooks/useRealBenchmark';
import { BENCHMARK_SAMPLES } from '../constants';
import { BenchmarkResult } from '../types'
import { ChartContainer } from './ui/chart-container';
import { InlineError, InlineInfo } from './ui/inline-error';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';

interface BenchmarkingViewProps {
  isDarkMode: boolean;
  embedded?: boolean;
}

function getDeviceChartKey(device: string): string {
  const match = device.match(/\(GPU\s*(\d+)\)/i);
  if (match?.[1] !== undefined) return `GPU ${match[1]}`;
  return device.length > 18 ? `${device.slice(0, 15)}...` : device;
}

// Создаем тип для комбинированных данных
interface CombinedBenchmarkData extends Omit<BenchmarkResult, 'timestamp'> {
  precision: string;
  isReal?: boolean;
  temperature?: number;
  powerDraw?: number;
  utilization?: number;
  fanSpeed?: number;
  memoryClock?: number;
  coreClock?: number;
}

const BenchmarkingView: React.FC<BenchmarkingViewProps> = ({ isDarkMode = true, embedded = false }) => {
  const {
    realData,
    stats,
    history,
    latestData,
    isLoading,
    isPolling,
    error,
    lastUpdate,
    fetchData,
    togglePolling,
    clearHistory,
  } = useRealBenchmark({
    autoPoll: true,
    pollingInterval: 5000,
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const gridColor = isDarkMode ? 'oklch(100% 0 0 / 12%)' : 'oklch(88% 0.014 260)';
  const textColor = isDarkMode ? 'oklch(68% 0.02 260)' : 'oklch(48% 0.025 260)';
  const tooltipBg = isDarkMode ? 'oklch(22% 0.025 260)' : 'oklch(99% 0.006 260)';
  const tooltipBorder = isDarkMode ? 'oklch(100% 0 0 / 14%)' : 'oklch(88% 0.014 260)';
  const tooltipText = isDarkMode ? 'oklch(94% 0.012 260)' : 'oklch(24% 0.025 260)';

  // Комбинированные данные: реальные + эталонные
  const getCombinedData = (): CombinedBenchmarkData[] => {
    const combined: CombinedBenchmarkData[] = [];
    
    // Добавляем эталонные данные
    BENCHMARK_SAMPLES.forEach(sample => {
      combined.push({
        device: sample.device,
        tps: sample.tps,
        latency: sample.latency,
        memory: sample.memory,
        precision: sample.precision,
        isReal: false
      });
    });
    
    // Добавляем реальные данные
    latestData.forEach(real => {
      const existingIndex = combined.findIndex(item => 
        item.device.toLowerCase().includes(real.device.toLowerCase()) ||
        real.device.toLowerCase().includes(item.device.toLowerCase())
      );
      
      if (existingIndex !== -1) {
        const existing = combined[existingIndex];
        if (existing) {
          // Обновляем существующие записи
          combined[existingIndex] = {
            ...existing,
            tps: real.tps || existing.tps,
            latency: real.latency || existing.latency,
            memory: real.memory || existing.memory,
            precision: existing.precision ?? 'unknown',
            isReal: true,
            temperature: real.temperature,
            powerDraw: real.powerDraw,
            utilization: real.utilization,
            fanSpeed: real.fanSpeed,
            memoryClock: real.memoryClock,
            coreClock: real.coreClock
          };
        }
      } else {
        // Добавляем новые устройства
        combined.push({
          device: real.device,
          tps: real.tps,
          latency: real.latency,
          memory: real.memory,
          precision: 'FP16',
          isReal: true,
          temperature: real.temperature,
          powerDraw: real.powerDraw,
          utilization: real.utilization,
          fanSpeed: real.fanSpeed,
          memoryClock: real.memoryClock,
          coreClock: real.coreClock
        });
      }
    });
    
    return combined.sort((a, b) => b.tps - a.tps);
  };

  // Данные для графика температуры/мощности
  interface TemperaturePowerData {
    device: string;
    temperature?: number;
    powerDraw?: number;
    utilization?: number;
    tps: number;
  }

  const getTemperaturePowerData = (): TemperaturePowerData[] => {
    return latestData.map(item => ({
      device: item.device,
      temperature: item.temperature,
      powerDraw: item.powerDraw,
      utilization: item.utilization,
      tps: item.tps,
    }));
  };

  // Данные для временного ряда
  interface TimeSeriesData {
    time: string;
    [deviceName: string]: string | number;
  }

  const getTimeSeriesData = (): TimeSeriesData[] => {
    const timeMap = new Map<string, TimeSeriesData>();
    
    history.slice(-30).forEach(item => {
      const timeKey = new Date(item.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      const deviceKey = getDeviceChartKey(item.device);
      
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timeKey });
      }
      
      const timeData = timeMap.get(timeKey)!;
      timeData[deviceKey] = item.tps;
      timeData[`${deviceKey}_temp`] = item.temperature;
    });
    
    return Array.from(timeMap.values());
  };

  const formatNumber = (num: number, decimals: number = 1): string => {
    if (isNaN(num) || !isFinite(num)) return '—';
    return num.toFixed(decimals);
  };

  const formatMemory = (gb: number): string => {
    return `${formatNumber(gb, 2)} GB`;
  };

  const formatTemperature = (temp?: number): string => {
    if (temp === undefined || temp === null) return '—';
    return `${formatNumber(temp)}°C`;
  };

  const formatPower = (power?: number): string => {
    if (power === undefined || power === null) return '—';
    return `${formatNumber(power, 0)}W`;
  };

  const timeSeriesDeviceKeys = useMemo(() => {
    const keys = new Set<string>();
    history.slice(-30).forEach((item) => {
      keys.add(getDeviceChartKey(item.device));
    });
    return Array.from(keys);
  }, [history]);
  const hasLiveData = latestData.length > 0;
  const combinedData = getCombinedData();

  const statusLabel = isPolling
    ? lastUpdate
      ? `Авто · ${lastUpdate}`
      : 'Автообновление'
    : lastUpdate
      ? `Пауза · ${lastUpdate}`
      : 'Пауза';

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
          isPolling ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent'
        )}
        title={isPolling ? 'Автообновление включено' : 'Пауза'}
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

  const banners = (error || (isLoading && !hasLiveData) || (!isLoading && !error && !hasLiveData)) && (
    <div className="space-y-2 max-w-3xl">
      <InlineError message={error} />
      {error && (
        <button
          type="button"
          onClick={() => void fetchData()}
          className="text-sm font-medium text-primary hover:underline"
        >
          Повторить попытку
        </button>
      )}
      {isLoading && !hasLiveData && !error && (
        <InlineInfo message="Загрузка данных бенчмарка с сервера..." />
      )}
      {!isLoading && !error && !hasLiveData && (
        <InlineInfo message="Нет live-данных с GPU. Показаны эталонные значения для сравнения." />
      )}
    </div>
  );

  const body = (
    <>
      {banners}

      {embedded && (
        <div className="flex items-center justify-between gap-3">
          {headerActions}
        </div>
      )}

      {/* Статистика в реальном времени */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-panel border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <div className="text-sm text-muted-foreground">Средний TPS</div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.avgTps)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Макс: {formatNumber(stats.maxTps)}
            </div>
          </div>
          
          <div className="glass-panel border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="text-sm text-muted-foreground">Температура</div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.avgTemperature)}°C
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Макс: {formatNumber(stats.maxTemperature)}°C
            </div>
          </div>
          
          <div className="glass-panel border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <div className="text-sm text-muted-foreground">Утилизация GPU</div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.avgUtilization)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Устройств: {stats.activeDevices}
            </div>
          </div>
          
          <div className="glass-panel border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <div className="text-sm text-muted-foreground">Мощность</div>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(stats.peakPowerDraw)}W
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Обновлено: {lastUpdate}
            </div>
          </div>
        </div>
      )}

      {/* Графики */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Производительность (TPS) */}
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">
              Производительность (Токенов/сек)
            </h3>
            <span className="text-sm text-muted-foreground">
              {realData.length} реальных устройств
            </span>
          </div>
          <ChartContainer height={288}>
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <BarChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="device" 
                  stroke={textColor} 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const name = value as string;
                    return name.length > 15 ? `${name.substring(0, 12)}...` : name;
                  }}
                />
                <YAxis stroke={textColor} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value, name) => {
                    if (name === 'tps') {
                      return [formatNumber(Number(value)), 'Токенов/сек'];
                    }
                    if (name === 'utilization') {
                      return [`${formatNumber(Number(value))}%`, 'Утилизация'];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="tps" radius={[4, 4, 0, 0]} name="Токенов/сек">
                  {combinedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isReal ? COLORS[index % COLORS.length] : '#9ca3af'}
                      opacity={entry.isReal ? 0.8 : 0.4}
                      stroke={entry.isReal ? undefined : '#6b7280'}
                      strokeWidth={entry.isReal ? 0 : 1}
                    />
                  ))}
                </Bar>
                {combinedData.some(d => d.utilization) && (
                  <Bar dataKey="utilization" radius={[4, 4, 0, 0]} name="Утилизация %" fill="#8b5cf6" opacity={0.6} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Температура и мощность */}
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">
              Температура и Мощность
            </h3>
            <span className="text-sm text-muted-foreground">
              {latestData.length} активных устройств
            </span>
          </div>
          <ChartContainer height={288}>
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <ComposedChart data={getTemperaturePowerData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="device" 
                  stroke={textColor} 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const name = value as string;
                    return name.length > 10 ? `${name.substring(0, 8)}...` : name;
                  }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={textColor} 
                  fontSize={12}
                  label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke={textColor} 
                  fontSize={12}
                  label={{ value: 'Мощность (W)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value, name) => {
                    if (name === 'temperature') return [`${formatNumber(Number(value))}°C`, 'Температура'];
                    if (name === 'powerDraw') return [`${formatNumber(Number(value))}W`, 'Мощность'];
                    if (name === 'utilization') return [`${formatNumber(Number(value))}%`, 'Утилизация'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="temperature" 
                  name="Температура" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.7}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="powerDraw" 
                  name="Мощность" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Использование памяти */}
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-foreground mb-6">
            Использование памяти (GB)
          </h3>
          <ChartContainer height={256}>
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <BarChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="device" 
                  stroke={textColor} 
                  fontSize={12}
                  tickFormatter={(value) => {
                    const name = value as string;
                    return name.length > 15 ? `${name.substring(0, 12)}...` : name;
                  }}
                />
                <YAxis stroke={textColor} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value) => [formatNumber(Number(value), 2), 'GB']}
                />
                <Bar dataKey="memory" radius={[4, 4, 0, 0]} name="Память">
                  {combinedData.map((entry, index) => (
                    <Cell 
                      key={`memory-cell-${index}`} 
                      fill={entry.isReal ? '#3b82f6' : '#9ca3af'}
                      opacity={entry.isReal ? 0.8 : 0.4}
                      stroke={entry.isReal ? undefined : '#6b7280'}
                      strokeWidth={entry.isReal ? 0 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* История производительности */}
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">
              История производительности
            </h3>
            <span className="text-sm text-muted-foreground">
              {history.length} записей
            </span>
          </div>
          <ChartContainer height={256}>
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <AreaChart data={getTimeSeriesData()}>
                <defs>
                  <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="time" 
                  stroke={textColor} 
                  fontSize={11}
                  interval="preserveStartEnd"
                />
                <YAxis stroke={textColor} fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value, name) => {
                    if (typeof name === 'string' && name.includes('temp')) {
                      return [`${formatNumber(Number(value))}°C`, 'Температура'];
                    }
                    return [formatNumber(Number(value)), 'TPS'];
                  }}
                />
                {timeSeriesDeviceKeys.map((deviceKey, index) => (
                  <Area
                    key={deviceKey}
                    type="monotone"
                    dataKey={deviceKey}
                    stroke={COLORS[index % COLORS.length]}
                    fill={`${COLORS[index % COLORS.length]}33`}
                    strokeWidth={2}
                    name={`${deviceKey} TPS`}
                    activeDot={{ r: 4 }}
                  />
                ))}
                {timeSeriesDeviceKeys.map((deviceKey, index) => (
                  <Line
                    key={`${deviceKey}_temp`}
                    type="monotone"
                    dataKey={`${deviceKey}_temp`}
                    stroke={COLORS[(index + 2) % COLORS.length]}
                    strokeWidth={2}
                    name={`${deviceKey} темп.`}
                    dot={{ r: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      {/* Детальная таблица */}
      <div className="glass-panel border border-border rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">
              Детальная информация об устройствах
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Реальные данные</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Эталонные данные</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background/50 dark:bg-muted/50 text-muted-foreground font-medium">
                <th className="px-6 py-4">Устройство</th>
                <th className="px-6 py-4">Тип</th>
                <th className="px-6 py-4">Токенов/сек</th>
                <th className="px-6 py-4">Утилизация</th>
                <th className="px-6 py-4">Память</th>
                <th className="px-6 py-4">Температура</th>
                <th className="px-6 py-4">Мощность</th>
                <th className="px-6 py-4">Вентилятор</th>
                <th className="px-6 py-4">Частота</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-border">
              {combinedData.map((item, idx) => {
                const isReal = item.isReal || false;
                const memoryPercentage = (item.memory / 24) * 100; // Предполагаем 24GB max
                const tempColor = item.temperature && item.temperature > 75 ? 'text-red-600 dark:text-red-400' :
                                 item.temperature && item.temperature > 60 ? 'text-amber-600 dark:text-amber-400' :
                                 'text-emerald-600 dark:text-emerald-400';
                const powerColor = item.powerDraw && item.powerDraw > 250 ? 'text-red-600 dark:text-red-400' :
                                  item.powerDraw && item.powerDraw > 200 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-emerald-600 dark:text-emerald-400';
                
                return (
                  <tr 
                    key={idx} 
                    className={`hover:bg-background/50 dark:hover:bg-muted/30 transition-colors ${
 isReal ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-foreground dark:text-foreground">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isReal ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        <span>{item.device}</span>
                        {isReal && (
                          <span className="px-2 py-0.5 bg-blue-500/10 text-primary text-xs rounded-full">
                            Live
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {isReal ? 'Реальное' : 'Эталонное'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isReal ? 'text-primary' : 'text-foreground/80'}`}>
                          {formatNumber(item.tps)}
                        </span>
                        {isReal && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isReal && item.utilization !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border dark:bg-muted rounded-full h-2">
                            <div 
                              className="h-full bg-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${item.utilization}%` }}
                            ></div>
                          </div>
                          <span className="text-purple-600 dark:text-purple-400 font-medium text-sm">
                            {formatNumber(item.utilization)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-border dark:bg-muted rounded-full h-2">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(memoryPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {formatMemory(item.memory)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isReal && item.temperature !== undefined ? (
                        <div className={`font-medium ${tempColor}`}>
                          {formatTemperature(item.temperature)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isReal && item.powerDraw !== undefined ? (
                        <div className={`font-medium ${powerColor}`}>
                          {formatPower(item.powerDraw)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isReal && item.fanSpeed !== undefined ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-foreground/80">
                            {formatNumber(item.fanSpeed)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isReal && item.memoryClock !== undefined && item.coreClock !== undefined ? (
                        <div className="text-xs text-muted-foreground">
                          <div>Память: {formatNumber(item.memoryClock, 0)} MHz</div>
                          <div>Ядро: {formatNumber(item.coreClock, 0)} MHz</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Футер таблицы */}
        <div className="px-6 py-4 border-t border-border surface-muted">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {stats ? `Всего записей: ${stats.totalSamples} • Устройств: ${stats.activeDevices}` : 'Загрузка данных...'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {isPolling ? 'Автообновление' : 'Пауза'}
              </span>
              <span>•</span>
              <span>Обновлено: {lastUpdate}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="w-full min-w-0 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold text-foreground">Производительность</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">
              {statusLabel}
            </span>
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