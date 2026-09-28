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
import {
  isThrottleWarning,
  readGpuDetails,
  throttleReasonLabel,
  type GpuClock,
} from '../../utils/gpuDetails';

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

function ClockTile({ label, clock }: { label: string; clock: GpuClock }) {
  const share = clock.current !== null && clock.max ? Math.min(100, Math.round((clock.current / clock.max) * 100)) : null;
  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {share !== null && <span className="text-[10px] text-muted-foreground">{share}%</span>}
      </div>
      <div className="font-semibold text-sm">
        {clock.current ?? 0}
        {clock.max ? <span className="font-normal text-muted-foreground"> / {clock.max}</span> : null} MHz
      </div>
      {share !== null && <Progress value={share} className="h-1 mt-1" />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-mono text-right break-all">{value}</span>
    </div>
  );
}

function formatRange(range: GpuClock, format: (value: number) => string): string | null {
  if (range.current === null && range.max === null) return null;
  const current = range.current !== null ? format(range.current) : '—';
  return range.max !== null ? `${current} из ${format(range.max)}` : current;
}

export function GpuMonitorCard({ gpuKey, gpuIndex, stat }: GpuMonitorCardProps) {
  const used = stat.used ?? (stat.used_mb ? stat.used_mb / 1024 : 0);
  const total = stat.total ?? (stat.total_mb ? stat.total_mb / 1024 : 0);
  const percentage = stat.percentage ?? (total > 0 ? Math.round((used / total) * 100) : 0);
  const temperature = stat.temperature ?? 0;
  const utilization = stat.utilization ?? 0;
  const fan = stat.fan ?? stat.fanSpeed ?? 0;
  const details = readGpuDetails(stat);
  const power = details.power.draw ?? 0;
  const tempTone = getUsageTone(Math.min(temperature, 100));
  const warnings = details.throttleReasons.filter(isThrottleWarning);
  const { info } = details;
  const hasInfo = Boolean(
    info.uuid || info.brand || info.architecture || info.vbios || info.driver || info.cuda || info.pciBusId ||
      info.persistenceMode || info.computeMode ||
      info.pcieGen.current !== null || info.pcieWidth.current !== null,
  );
  const tempThresholds = [
    details.temperature.target !== null ? `цель ${details.temperature.target}°C` : null,
    details.temperature.slowdown !== null ? `замедление ${details.temperature.slowdown}°C` : null,
    details.temperature.max !== null ? `макс. ${details.temperature.max}°C` : null,
  ].filter(Boolean);
  const extraUtil = [
    details.util.memory !== null ? `память ${details.util.memory}%` : null,
    details.util.encoder !== null ? `кодер ${details.util.encoder}%` : null,
    details.util.decoder !== null ? `декодер ${details.util.decoder}%` : null,
  ].filter(Boolean);

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
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {details.pstate && (
              <Badge
                variant="outline"
                title={details.idle ? 'Карта простаивает, драйвер снизил частоты' : 'Энергорежим (P0 — максимальная производительность)'}
              >
                {details.pstate}
                {details.idle ? ' · простой' : ''}
              </Badge>
            )}
            <Badge variant={getBadgeVariant(percentage)}>{percentage}% памяти</Badge>
          </div>
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
            {(details.memoryFreeMb !== null || details.memoryReservedMb !== null) && (
              <div className="text-xs text-muted-foreground mt-1">
                {details.memoryFreeMb !== null ? `свободно ${(details.memoryFreeMb / 1024).toFixed(2)} GB` : ''}
                {details.memoryFreeMb !== null && details.memoryReservedMb !== null ? ' · ' : ''}
                {details.memoryReservedMb !== null ? `резерв ${(details.memoryReservedMb / 1024).toFixed(2)} GB` : ''}
              </div>
            )}
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
                {details.power.limit !== null && (
                  <div className="text-[11px] text-muted-foreground">из {details.power.limit.toFixed(0)} Вт</div>
                )}
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

          {(tempThresholds.length > 0 || extraUtil.length > 0 || details.power.instant !== null) && (
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {tempThresholds.length > 0 && <div>Температура: {tempThresholds.join(' · ')}</div>}
              {extraUtil.length > 0 && <div>Загрузка: {extraUtil.join(' · ')}</div>}
              {details.power.instant !== null && (
                <div>
                  Мгновенная мощность {details.power.instant.toFixed(1)} Вт
                  {details.power.minLimit !== null && details.power.maxLimit !== null
                    ? ` · допустимый лимит ${details.power.minLimit.toFixed(0)}–${details.power.maxLimit.toFixed(0)} Вт`
                    : ''}
                  {details.power.defaultLimit !== null ? ` · по умолчанию ${details.power.defaultLimit.toFixed(0)} Вт` : ''}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Тактовые частоты (сейчас / макс.)</span>
              <div className="flex flex-wrap gap-1">
                {details.idle && (
                  <Badge variant="secondary" title="Нет нагрузки: драйвер держит минимальные частоты. Во время генерации они поднимутся.">
                    простой — частоты снижены
                  </Badge>
                )}
                {warnings.map((reason) => (
                  <Badge key={reason} variant="warning" title={reason}>
                    {throttleReasonLabel(reason)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ClockTile label="Ядро" clock={details.clocks.core} />
              <ClockTile label="Память" clock={details.clocks.memory} />
              {details.clocks.sm.current !== null && <ClockTile label="SM" clock={details.clocks.sm} />}
              {details.clocks.video.current !== null && <ClockTile label="Видео" clock={details.clocks.video} />}
            </div>
          </div>

          {details.processes.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-1.5">Процессы ({details.processes.length})</div>
              <div className="space-y-1 text-xs">
                {details.processes.map((proc, index) => (
                  <div key={`${proc.pid ?? 'x'}-${index}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-mono" title={proc.name}>
                      {proc.name.split('/').pop()}
                      <span className="text-muted-foreground">
                        {proc.pid !== null ? ` · PID ${proc.pid}` : ''}
                        {proc.type ? ` · ${proc.type}` : ''}
                      </span>
                    </span>
                    {proc.memoryMb !== null && (
                      <span className="shrink-0 font-mono">{(proc.memoryMb / 1024).toFixed(2)} GB</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasInfo && (
            <details className="pt-2 border-t text-xs">
              <summary className="cursor-pointer text-sm text-muted-foreground">Сведения об устройстве</summary>
              <div className="mt-1.5">
                <InfoRow label="Бренд" value={info.brand} />
                <InfoRow label="Архитектура" value={info.architecture} />
                <InfoRow label="Драйвер" value={info.driver} />
                <InfoRow label="CUDA" value={info.cuda} />
                <InfoRow label="VBIOS" value={info.vbios} />
                <InfoRow label="Persistence" value={info.persistenceMode} />
                <InfoRow label="Compute" value={info.computeMode} />
                <InfoRow label="PCI" value={info.pciBusId} />
                <InfoRow label="PCIe поколение" value={formatRange(info.pcieGen, (v) => `Gen${v}`)} />
                <InfoRow label="PCIe ширина" value={formatRange(info.pcieWidth, (v) => `${v}x`)} />
                {details.idle && info.pcieGen.current !== null && info.pcieGen.max !== null &&
                  info.pcieGen.current < info.pcieGen.max && (
                    <div className="text-muted-foreground pt-0.5">
                      В простое карта снижает поколение PCIe для экономии энергии, под нагрузкой оно поднимется.
                    </div>
                  )}
                <InfoRow label="UUID" value={info.uuid} />
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
