/**
 * Лимит контекстного окна слота (`CONTEXT_LIMIT`).
 * `finish_reason: "length"` сам по себе — обрыв по maxTokens, не этот флаг.
 */

export interface ContextLimitNotice {
  message: string;
  contextSize: number | null;
  tokensPrompt: number | null;
  tokensGenerated: number | null;
}

const DEFAULT_MESSAGE = 'Достигнут лимит контекстного окна. Начните новый чат, чтобы продолжить.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNum(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function readContextLimit(raw: unknown): ContextLimitNotice | null {
  const data = asRecord(raw);
  if (!data) return null;
  const flagged =
    data.contextLimit === true ||
    data.object === 'chat.context_limit' ||
    data.code === 'CONTEXT_LIMIT';
  if (!flagged) return null;

  const message =
    (typeof data.contextLimitMessage === 'string' && data.contextLimitMessage.trim()) ||
    (typeof data.error === 'string' && data.error.trim()) ||
    DEFAULT_MESSAGE;

  return {
    message,
    contextSize: asNum(data.contextSize),
    tokensPrompt: asNum(data.tokensPrompt),
    tokensGenerated: asNum(data.tokensGenerated),
  };
}

export function contextLimitFromBody(body: string): ContextLimitNotice | null {
  try {
    return readContextLimit(JSON.parse(body) as unknown);
  } catch {
    return null;
  }
}

export class ContextLimitError extends Error {
  readonly notice: ContextLimitNotice;

  constructor(notice: ContextLimitNotice) {
    super(notice.message);
    this.name = 'ContextLimitError';
    this.notice = notice;
  }
}

export function isContextLimitError(error: unknown): error is ContextLimitError {
  return error instanceof ContextLimitError;
}

/** «57000 + 8536 из 65536», если сервер прислал счётчики. */
export function contextLimitUsageLabel(notice: ContextLimitNotice): string | null {
  if (notice.contextSize === null && notice.tokensPrompt === null && notice.tokensGenerated === null) {
    return null;
  }
  const used = `${notice.tokensPrompt ?? 0} + ${notice.tokensGenerated ?? 0}`;
  return notice.contextSize !== null ? `${used} из ${notice.contextSize}` : used;
}
