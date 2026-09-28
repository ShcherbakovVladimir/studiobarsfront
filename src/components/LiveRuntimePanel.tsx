import { createPortal } from 'react-dom';
import { useEffect, type ReactNode } from 'react';
import { Activity, Cpu, Gauge, Thermometer, X, Zap } from 'lucide-react';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';
import { useDrawerRootRef, useWorkspaceOverlay } from '../utils/workspaceLayout';
import { useHardwareMonitoring } from '../hooks/useHardwareMonitoring';
import { listGpus } from '../utils/gpuUtils';
import {
  isThrottleWarning,
  readGpuDetails,
  throttleReasonLabel,
  type GpuClock,
} from '../utils/gpuDetails';
import { inferenceSourceLabel, readInference } from '../utils/inferenceSnapshot';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface LiveRuntimePanelProps {
  open: boolean;
  onClose: () => void;
  streaming?: boolean;
}

function fmt(value: number | null | undefined, digits = 1, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${suffix}`;
}

function clockRange(clock: GpuClock, suffix = ' MHz'): string {
  if (clock.current === null && clock.max === null) return '—';
  const current = fmt(clock.current, 0);
  return clock.max !== null ? `${current} / ${fmt(clock.max, 0)}${suffix}` : `${current}${suffix}`;
}

function mbToGb(value: number | null): string {
  return value === null ? '—' : `${(value / 1024).toFixed(2)} GB`;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-2 py-0.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-mono text-right min-w-0 break-all">{value}</span>
    </div>
  );
}

export function LiveRuntimePanel({ open, onClose, streaming = false }: LiveRuntimePanelProps) {
  const overlay = useWorkspaceOverlay();
  const drawerRef = useDrawerRootRef(open);
  const { data, error, lastUpdated, isLoading, refresh } = useHardwareMonitoring({
    enabled: open,
    autoPoll: true,
    pollingInterval: streaming ? 1000 : 4000,
  });

  useEffect(() => {
    if (open && streaming) void refresh();
  }, [open, streaming, refresh]);

  const inference = readInference(data?.inference);
  const gpus = listGpus(data?.gpu);
  const system = data?.system;
  const server = data?.server;

  const panel = (
    <aside
      ref={drawerRef}
      aria-hidden={!open}
      inert={!open}
      aria-label="Мониторинг модели и системы"
      className={cn(
        celestia.workspaceDrawer,
        'right-0',
        'max-md:!inset-x-0 max-md:!top-auto max-md:!bottom-0 max-md:!h-[min(78dvh,40rem)] max-md:!max-h-[78dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-[1.75rem] max-md:rounded-b-none max-md:border-x-0 max-md:border-t max-md:pt-0 max-md:bg-card max-md:backdrop-blur-none',
        'md:top-0 md:h-full md:rounded-none',
        'md:max-xl:bg-card md:max-xl:backdrop-blur-none',
        'xl:bg-transparent xl:backdrop-blur-none',
        open
          ? cn(
              'translate-x-0 translate-y-0 border-border shadow-[0_-8px_32px_rgba(15,23,42,0.12)]',
              'md:shadow-xl xl:shadow-none xl:w-80 xl:max-w-none xl:border-l xl:border-border',
            )
          : cn(
              'pointer-events-none opacity-0',
              'max-md:translate-y-full max-md:translate-x-0',
              'md:max-xl:translate-x-full',
              'xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0 xl:translate-y-0',
              'border-transparent',
            ),
        open && 'w-[min(22rem,calc(100vw-2.5rem))] max-w-[90vw] md:max-xl:w-80',
      )}
    >
      <div className="xl:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
        <span className="h-1 w-11 rounded-full bg-muted-foreground/35" />
      </div>

      <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate leading-tight">Мониторинг</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {streaming ? `генерация · 1 с${lastUpdated ? ` · ${lastUpdated}` : ''}` : lastUpdated || (isLoading ? 'загрузка…' : 'пауза')}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void refresh()}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground text-xs"
            title="Обновить"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground"
            title="Скрыть панель"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        <section className="rounded-2xl border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Gauge className="w-3.5 h-3.5" />
              Модель
            </div>
            {inference.available ? (
              <Badge variant={inference.running || streaming ? 'warning' : 'secondary'}>
                {inference.running || streaming ? 'генерирует' : inference.idle ? 'простой' : 'готова'}
              </Badge>
            ) : (
              <Badge variant="outline">не загружена</Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate" title={inference.modelName ?? undefined}>
            {inference.available ? inference.modelName ?? inference.modelId ?? '—' : 'Нет активной модели'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-accent/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">Генерация</div>
              <div className="text-sm font-semibold font-mono">{fmt(inference.genTps)} ток/с</div>
            </div>
            <div className="rounded-xl bg-accent/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">Промпт</div>
              <div className="text-sm font-semibold font-mono">{fmt(inference.promptTps)} ток/с</div>
            </div>
            <div className="rounded-xl bg-accent/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">TTFT</div>
              <div className="text-sm font-semibold font-mono">{fmt(inference.ttftMs, 0)} мс</div>
            </div>
            <div className="rounded-xl bg-accent/50 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">Ответ</div>
              <div className="text-sm font-semibold font-mono">{fmt(inference.latencyMs, 0)} мс</div>
            </div>
          </div>
          <Row label="Квант" value={inference.precision ?? '—'} />
          <Row label="Контекст" value={inference.contextSize ?? '—'} />
          <Row label="Токены" value={`${fmt(inference.tokensPrompt, 0)} → ${fmt(inference.tokensGenerated, 0)}`} />
          <Row label="Источник" value={inferenceSourceLabel(inference.source) || '—'} />
          {inference.available && inference.genTps === null && inference.promptTps === null && (
            <p className="text-[11px] text-muted-foreground">Скорости появятся после первого ответа модели.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            Система
          </div>
          <Row label="CPU" value={`${fmt(system?.cpuUsage, 0)}%`} />
          {system?.cpuUsage !== undefined && <Progress value={system.cpuUsage} className="h-1" />}
          {system?.cpuCores != null && <Row label="Ядра" value={system.cpuCores} />}
          <Row label="RAM" value={`${system?.usedMemory ?? '—'} / ${system?.totalMemory ?? '—'}`} />
          {system?.memoryUsage !== undefined && <Progress value={system.memoryUsage} className="h-1" />}
          {system?.freeMemory && <Row label="RAM свободно" value={system.freeMemory} />}
          <Row label="Диск" value={`${fmt(system?.diskUsage, 0)}%`} />
          <Row label="Аптайм" value={system?.uptime ?? '—'} />
          {system?.loadAverage && (
            <Row label="Load" value={system.loadAverage.map((n) => n.toFixed(2)).join(' · ')} />
          )}
          {(system?.platform || system?.arch) && (
            <Row label="Платформа" value={[system.platform, system.arch].filter(Boolean).join(' · ')} />
          )}
          {system?.networkActive !== undefined && (
            <Row label="Сеть" value={system.networkActive ? 'активна' : 'тишина'} />
          )}
          {server && (
            <>
              <Row label="API heap" value={`${((server.memory.heapUsed ?? 0) / 1024 / 1024).toFixed(0)} МБ`} />
              <Row label="API RSS" value={`${((server.memory.rss ?? 0) / 1024 / 1024).toFixed(0)} МБ`} />
              {server.uptime != null && <Row label="API аптайм" value={`${Math.round(server.uptime)} с`} />}
              {server.version && <Row label="API" value={server.version} />}
            </>
          )}
        </section>

        {!isLoading && gpus.length === 0 && (
          <p className="text-xs text-muted-foreground">Снимок GPU ещё не пришёл.</p>
        )}

        {gpus.map(({ key, stat }) => {
          const details = readGpuDetails(stat);
          const { info } = details;
          const used = stat.used ?? (stat.used_mb ? stat.used_mb / 1024 : 0);
          const total = stat.total ?? (stat.total_mb ? stat.total_mb / 1024 : 0);
          const share = stat.percentage ?? (total > 0 ? Math.round((used / total) * 100) : 0);
          const warnings = details.throttleReasons.filter(isThrottleWarning);
          const tempThresholds = [
            details.temperature.target !== null ? `цель ${details.temperature.target}°` : null,
            details.temperature.slowdown !== null ? `slow ${details.temperature.slowdown}°` : null,
            details.temperature.max !== null ? `макс ${details.temperature.max}°` : null,
          ].filter(Boolean);
          return (
            <section key={key} className="rounded-2xl border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold min-w-0">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{stat.name?.replace(/^NVIDIA GeForce\s+/i, '') ?? key}</span>
                </div>
                <Badge variant="outline">
                  {key}
                  {details.pstate ? ` · ${details.pstate}` : ''}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-accent/50 px-1 py-1">
                  <Thermometer className="w-3 h-3 mx-auto mb-0.5" />
                  <div className="text-[11px] font-mono">{fmt(stat.temperature, 0)}°</div>
                </div>
                <div className="rounded-lg bg-accent/50 px-1 py-1">
                  <Activity className="w-3 h-3 mx-auto mb-0.5" />
                  <div className="text-[11px] font-mono">{fmt(stat.utilization, 0)}%</div>
                </div>
                <div className="rounded-lg bg-accent/50 px-1 py-1">
                  <Zap className="w-3 h-3 mx-auto mb-0.5" />
                  <div className="text-[11px] font-mono">{fmt(details.power.draw, 0)} Вт</div>
                </div>
              </div>
              <Row label="Память" value={`${fmt(used, 2)} / ${fmt(total, 0)} GB`} />
              <Progress value={share} className="h-1" />
              {(details.memoryFreeMb !== null || details.memoryReservedMb !== null) && (
                <Row
                  label="Свободно / резерв"
                  value={`${mbToGb(details.memoryFreeMb)} / ${mbToGb(details.memoryReservedMb)}`}
                />
              )}
              <Row label="Ядро" value={clockRange(details.clocks.core)} />
              <Row label="Память МГц" value={clockRange(details.clocks.memory)} />
              {details.clocks.sm.current !== null && <Row label="SM" value={clockRange(details.clocks.sm)} />}
              {details.clocks.video.current !== null && <Row label="Видео" value={clockRange(details.clocks.video)} />}
              <Row label="Вентилятор" value={`${fmt(stat.fan ?? stat.fanSpeed, 0)}%`} />
              {details.power.limit !== null && <Row label="Лимит питания" value={`${fmt(details.power.limit, 0)} Вт`} />}
              {details.power.instant !== null && (
                <Row label="Мгновенно" value={`${fmt(details.power.instant, 1)} Вт`} />
              )}
              {details.power.defaultLimit !== null && (
                <Row label="Лимит по умолч." value={`${fmt(details.power.defaultLimit, 0)} Вт`} />
              )}
              {details.power.minLimit !== null && details.power.maxLimit !== null && (
                <Row
                  label="Диапазон лимита"
                  value={`${fmt(details.power.minLimit, 0)}–${fmt(details.power.maxLimit, 0)} Вт`}
                />
              )}
              {details.util.memory !== null && (
                <Row
                  label="Util mem/enc/dec"
                  value={`${fmt(details.util.memory, 0)} / ${fmt(details.util.encoder, 0)} / ${fmt(details.util.decoder, 0)}%`}
                />
              )}
              {tempThresholds.length > 0 && <Row label="Пороги t°" value={tempThresholds.join(' · ')} />}
              {details.idle && <p className="text-[11px] text-muted-foreground">Простой: частоты снижены.</p>}
              {warnings.map((reason) => (
                <Badge key={reason} variant="warning" className="text-[10px]">
                  {throttleReasonLabel(reason)}
                </Badge>
              ))}
              {details.processes.map((proc, procIndex) => (
                <Row
                  key={`${proc.pid ?? 'p'}-${procIndex}`}
                  label={proc.name.split('/').pop() ?? 'процесс'}
                  value={[
                    proc.pid !== null ? `PID ${proc.pid}` : null,
                    proc.type,
                    proc.memoryMb !== null ? `${(proc.memoryMb / 1024).toFixed(2)} GB` : null,
                  ].filter(Boolean).join(' · ')}
                />
              ))}
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">Сведения</summary>
                <div className="mt-1 space-y-0.5">
                  <Row label="Бренд" value={info.brand} />
                  <Row label="Архитектура" value={info.architecture} />
                  <Row label="Драйвер" value={info.driver} />
                  <Row label="CUDA" value={info.cuda} />
                  <Row label="VBIOS" value={info.vbios} />
                  <Row label="Persistence" value={info.persistenceMode} />
                  <Row label="Compute" value={info.computeMode} />
                  <Row
                    label="PCIe"
                    value={
                      info.pcieGen.current !== null || info.pcieWidth.current !== null
                        ? `Gen${info.pcieGen.current ?? '—'} / Gen${info.pcieGen.max ?? '—'} · ${info.pcieWidth.current ?? '—'}x / ${info.pcieWidth.max ?? '—'}x`
                        : null
                    }
                  />
                  {details.idle &&
                    info.pcieGen.current !== null &&
                    info.pcieGen.max !== null &&
                    info.pcieGen.current < info.pcieGen.max && (
                      <p className="text-[11px]">В простое PCIe снижен, под нагрузкой поднимется.</p>
                    )}
                  <Row label="PCI" value={info.pciBusId} />
                  <Row label="UUID" value={info.uuid} />
                </div>
              </details>
            </section>
          );
        })}
      </div>
    </aside>
  );

  const ui = (
    <>
      {overlay && (
        <button
          type="button"
          aria-label="Закрыть мониторинг"
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-40 xl:hidden transition-opacity duration-300 ease-out',
            'bg-black/20 dark:bg-black/35',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        />
      )}
      {panel}
    </>
  );

  if (overlay && typeof document !== 'undefined') {
    return createPortal(ui, document.body);
  }
  return ui;
}
