/**
 * `inference` из `GET /api/monitoring/full`.
 * Модель не загружена: только `{ available: false }`.
 * Скорости — `null`, пока не было замера; 0 не подставляется.
 */

type Raw = Record<string, unknown>;

export type InferenceSource = 'last_request' | 'prometheus_average' | string;

export interface InferenceSnapshot {
  available: boolean;
  modelId: string | null;
  modelName: string | null;
  precision: string | null;
  contextSize: number | null;
  promptTps: number | null;
  genTps: number | null;
  ttftMs: number | null;
  latencyMs: number | null;
  tokensPrompt: number | null;
  tokensGenerated: number | null;
  running: boolean;
  idle: boolean;
  source: InferenceSource | null;
}

function num(raw: Raw, key: string): number | null {
  const value = raw[key];
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(raw: Raw, key: string): string | null {
  const value = raw[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bool(raw: Raw, key: string): boolean {
  return raw[key] === true;
}

export function readInference(raw: unknown): InferenceSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      available: false,
      modelId: null,
      modelName: null,
      precision: null,
      contextSize: null,
      promptTps: null,
      genTps: null,
      ttftMs: null,
      latencyMs: null,
      tokensPrompt: null,
      tokensGenerated: null,
      running: false,
      idle: true,
      source: null,
    };
  }

  const data = raw as Raw;
  const available = data.available === true;
  if (!available) {
    return readInference(null);
  }

  return {
    available: true,
    modelId: str(data, 'modelId'),
    modelName: str(data, 'modelName'),
    precision: str(data, 'precision'),
    contextSize: num(data, 'contextSize'),
    promptTps: num(data, 'promptTps'),
    genTps: num(data, 'genTps'),
    ttftMs: num(data, 'ttftMs'),
    latencyMs: num(data, 'latencyMs'),
    tokensPrompt: num(data, 'tokensPrompt'),
    tokensGenerated: num(data, 'tokensGenerated'),
    running: bool(data, 'running'),
    idle: bool(data, 'idle'),
    source: str(data, 'source'),
  };
}

export function inferenceSourceLabel(source: InferenceSource | null): string {
  if (source === 'last_request') return 'последний запрос';
  if (source === 'prometheus_average') return 'среднее с запуска llama-server';
  return source ?? '';
}
