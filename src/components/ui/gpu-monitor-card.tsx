import {
  Activity,
  Fan,
  Thermometer,
  Zap,
} from 'lucide-react';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import type { GpuStat } from '../../types';
import { getUsageTone, usageBgClass, usageTextClass } from './metric-utils';
import { gpuDotColor, gpuShortLabel } from '../../utils/gpuUtils';

export interface GpuMonitorStat {
  name?: string;
  used?: number;
  total?: number;
  used_mb?: number;
  total_mb?: number;
  percentage?: number;
  temperature?: number;
  utilization?: number;
  power?: number;
  powerDraw?: number;
  fan?: number;
  fanSpeed?: number;
  memory_clock?: number;
  memoryClock?: number;
  core_clock?: number;
  graphicsClock?: number;
}

interface GpuMonitorCardProps {
  gpuKey: string;
  gpuIndex: number;
  stat: GpuMonitorStat | Partial<GpuStat>;
}

function getBadgeVariant(percentage: number): 'default' | 'destructive' | 'outline' | 'secondary' | 'warning' {
  if (percentage > 80) return 'destructive';
  if (percentage > 50) return 'warning';
  return 'secondary';
}

export function GpuMonitorCard({ gpuKey, gpuIndex, stat }: GpuMonitorCardProps) {
  const used = stat.used ?? (stat.used_mb ? stat.used_mb / 1024 : 0);
  const total = stat.total ?? (stat.total_mb ? stat.total_mb / 1024 : 0);
  const percentage = stat.percentage ?? (total > 0 ? Math.round((used / total) * 100) : 0);
  const temperature = stat.temperature ?? 0;
  const utilization = stat.utilization ?? 0;
  const power = stat.power ?? stat.powerDraw ?? 0;
  const fan = stat.fan ?? stat.fanSpeed ?? 0;
  const memoryClock = stat.memory_clock ?? stat.memoryClock ?? 0;
  const coreClock = stat.core_clock ?? stat.graphicsClock ?? 0;
  const tempTone = getUsageTone(Math.min(temperature, 100));

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center min-w-0">
            <div className={`w-3 h-3 rounded-full ${gpuDotColor(gpuIndex)} mr-2 shrink-0`} />
            <span className="truncate" title={stat.name || gpuShortLabel(gpuKey, stat)}>
              {stat.name || gpuShortLabel(gpuKey, stat)}
            </span>
          </div>
          <Badge variant={getBadgeVariant(percentage)} className="shrink-0 ml-2">
            {percentage}% памяти
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Видеопамять</span>
              <span>{used.toFixed(2)} GB / {total.toFixed(0)} GB</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className={`p-3 rounded-lg ${usageBgClass(tempTone)}`}>
              <div className="flex flex-col items-center text-center">
                <Thermometer className="h-5 w-5 mb-1" />
                <div className="text-sm">Температура</div>
                <div className={`text-lg font-bold ${usageTextClass(tempTone)}`}>
                  {temperature}°C
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <div className="flex flex-col items-center text-center">
                <Activity className="h-5 w-5 mb-1 text-primary" />
                <div className="text-sm">Загрузка</div>
                <div className="text-lg font-bold text-primary">
                  {utilization}%
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <div className="flex flex-col items-center text-center">
                <Zap className="h-5 w-5 mb-1 text-purple-600 dark:text-purple-400" />
                <div className="text-sm">Питание</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {power.toFixed(1)} Вт
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <div className="flex flex-col items-center text-center">
                <Fan className="h-5 w-5 mb-1 text-cyan-600 dark:text-cyan-400" />
                <div className="text-sm">Вентилятор</div>
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {fan}%
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground mb-2">Тактовые частоты</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="text-xs text-muted-foreground">Память</div>
                <div className="font-semibold">{memoryClock} MHz</div>
              </div>
              <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="text-xs text-muted-foreground">Ядро</div>
                <div className="font-semibold">{coreClock} MHz</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
