/**
 * Разбор полного снимка nvidia-smi из `/api/monitoring/full` и `/api/finetune/gpu-stats`.
 * Поля необязательные: старый бэкенд их не отдаёт.
 */

type Raw = Record<string, unknown>;

export interface GpuClock {
  current: number | null;
  max: number | null;
}

export interface GpuProcess {
  pid: number | null;
  type: string | null;
  name: string;
  memoryMb: number | null;
}

export interface GpuDetails {
  pstate: string | null;
  idle: boolean;
  clocks: { core: GpuClock; memory: GpuClock; sm: GpuClock; video: GpuClock };
  throttleReasons: string[];
  power: {
    draw: number | null;
    instant: number | null;
    limit: number | null;
    minLimit: number | null;
    maxLimit: number | null;
  };
  temperature: { max: number | null; slowdown: number | null; target: number | null };
  util: { memory: number | null; encoder: number | null; decoder: number | null };
  processes: GpuProcess[];
  info: {
    uuid: string | null;
    architecture: string | null;
    vbios: string | null;
    driver: string | null;
    cuda: string | null;
    pciBusId: string | null;
    pcieGen: GpuClock;
    pcieWidth: GpuClock;
  };
}

function num(raw: Raw, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(raw: Raw, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() && !/^\[?(n\/a|not supported)\]?$/i.test(value.trim())) {
      return value.trim();
    }
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function record(value: unknown): Raw | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
}

/** `throttle_reasons` — массив только активных причин: `["gpu_idle"]` в простое, `[]` без причин. */
function parseThrottleReasons(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** `processes[]`: `pid`, `type` (`compute` | `graphics`), `name`, `used_mb`. */
function parseProcesses(value: unknown): GpuProcess[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(record)
    .filter((item): item is Raw => item !== null)
    .map((item) => ({
      pid: num(item, 'pid'),
      type: str(item, 'type'),
      name: str(item, 'name') ?? '—',
      memoryMb: num(item, 'used_mb'),
    }));
}

export function readGpuDetails(stat: object): GpuDetails {
  const raw = stat as Raw;
  const throttleReasons = parseThrottleReasons(raw.throttle_reasons);
  const pstate = str(raw, 'pstate');
  const pstateLevel = pstate ? Number.parseInt(pstate.replace(/^P/i, ''), 10) : NaN;

  return {
    pstate,
    idle: throttleReasons.includes('gpu_idle') || (Number.isFinite(pstateLevel) && pstateLevel >= 8),
    clocks: {
      core: { current: num(raw, 'core_clock', 'graphicsClock'), max: num(raw, 'core_clock_max') },
      memory: { current: num(raw, 'memory_clock', 'memoryClock'), max: num(raw, 'memory_clock_max') },
      sm: { current: num(raw, 'sm_clock'), max: num(raw, 'sm_clock_max') },
      video: { current: num(raw, 'video_clock'), max: num(raw, 'video_clock_max') },
    },
    throttleReasons,
    power: {
      draw: num(raw, 'power', 'powerDraw'),
      instant: num(raw, 'power_instant'),
      limit: num(raw, 'power_limit'),
      minLimit: num(raw, 'power_min_limit'),
      maxLimit: num(raw, 'power_max_limit'),
    },
    temperature: {
      max: num(raw, 'temperature_max'),
      slowdown: num(raw, 'temperature_slowdown'),
      target: num(raw, 'temperature_target'),
    },
    util: {
      memory: num(raw, 'memory_util'),
      encoder: num(raw, 'encoder_util'),
      decoder: num(raw, 'decoder_util'),
    },
    processes: parseProcesses(raw.processes),
    info: {
      uuid: str(raw, 'uuid'),
      architecture: str(raw, 'architecture', 'arch'),
      vbios: str(raw, 'vbios', 'vbios_version'),
      driver: str(raw, 'driver', 'driver_version'),
      cuda: str(raw, 'cuda', 'cuda_version'),
      pciBusId: str(raw, 'pci_bus_id'),
      pcieGen: { current: num(raw, 'pcie_gen_current'), max: num(raw, 'pcie_gen_max') },
      // Ширина приходит строкой `16x` / `8x`; parseFloat берёт число.
      pcieWidth: { current: num(raw, 'pcie_width_current'), max: num(raw, 'pcie_width_max') },
    },
  };
}

const THROTTLE_LABELS: Record<string, string> = {
  gpu_idle: 'простой',
  applications_clocks_setting: 'частоты заданы вручную',
  sw_power_cap: 'лимит мощности',
  hw_slowdown: 'аппаратное замедление',
  hw_thermal_slowdown: 'перегрев (аппаратно)',
  hw_power_brake_slowdown: 'ограничение питания БП',
  sw_thermal_slowdown: 'перегрев',
  sync_boost: 'синхронизация буста',
  display_clock_setting: 'частоты дисплея',
};

export function throttleReasonLabel(reason: string): string {
  return THROTTLE_LABELS[reason] ?? reason.replace(/_/g, ' ');
}

/** Причина снижения частот, которая означает проблему, а не простой. */
export function isThrottleWarning(reason: string): boolean {
  return reason !== 'gpu_idle' && reason !== 'applications_clocks_setting' && reason !== 'sync_boost';
}
