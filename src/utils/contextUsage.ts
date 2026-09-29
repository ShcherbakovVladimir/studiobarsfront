/**
 * Занятость слота после ответа: SSE `object: "chat.usage"` или те же поля
 * на верхнем уровне JSON. Это не сигнал «новый чат» — окно может быть занято наполовину.
 */

import type { ContextLimitNotice } from './contextLimit';

export interface ContextUsage {
  contextSize: number | null;
  tokensPrompt: number | null;
  tokensCached: number | null;
  tokensEvaluated: number | null;
  tokensGenerated: number | null;
  tokensTotal: number | null;
  updatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNum(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function fromRecord(data: Record<string, unknown>): ContextUsage | null {
  const usage: ContextUsage = {
    contextSize: asNum(data.contextSize),
    tokensPrompt: asNum(data.tokensPrompt),
    tokensCached: asNum(data.tokensCached),
    tokensEvaluated: asNum(data.tokensEvaluated),
    tokensGenerated: asNum(data.tokensGenerated),
    tokensTotal: asNum(data.tokensTotal),
    updatedAt: new Date().toISOString(),
  };
  if (usage.tokensTotal === null && usage.tokensPrompt !== null && usage.tokensGenerated !== null) {
    usage.tokensTotal = usage.tokensPrompt + usage.tokensGenerated;
  }
  return usage.contextSize === null && usage.tokensTotal === null && usage.tokensPrompt === null
    ? null
    : usage;
}

/** SSE-кадр: только `chat.usage`, остальные кадры с `contextSize` — это лимит. */
export function isUsageFrame(raw: unknown): boolean {
  return asRecord(raw)?.object === 'chat.usage';
}

export function readContextUsage(raw: unknown): ContextUsage | null {
  const data = asRecord(raw);
  return data ? fromRecord(data) : null;
}

/** 400 или событие лимита без отдельного `chat.usage`: слот занят целиком. */
export function usageFromContextLimit(notice: ContextLimitNotice): ContextUsage | null {
  return fromRecord({
    contextSize: notice.contextSize,
    tokensPrompt: notice.tokensPrompt,
    tokensGenerated: notice.tokensGenerated,
  });
}

export function usageRatio(usage: ContextUsage | null | undefined): number | null {
  if (!usage || usage.contextSize === null || usage.contextSize <= 0 || usage.tokensTotal === null) {
    return null;
  }
  return Math.min(1, Math.max(0, usage.tokensTotal / usage.contextSize));
}

export function formatTokens(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1000) {
    const k = value / 1000;
    return `${k >= 100 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return String(Math.round(value));
}
