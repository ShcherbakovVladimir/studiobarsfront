import type { UnknownRecord } from '../types';
import { readSseFrames } from './sseStream';

export type StreamChunkHandler = (chunk: string, fullResponse: string) => void;

export interface ChatStreamOptions {
  /** `performance.now()` снятый перед fetch — отделяет ожидание сервера от буферизации. */
  requestStartedAt?: number;
  /** Метка в диагностике: `chat`, `chat+tools`, `inference`. */
  label?: string;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function extractOpenAiDelta(parsed: UnknownRecord): string {
  const choices = parsed.choices;
  if (!Array.isArray(choices)) return '';

  const choice = asRecord(choices[0]);
  const delta = asRecord(choice?.delta);
  if (delta) {
    if (typeof delta.content === 'string' && delta.content) return delta.content;
    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
      return delta.reasoning_content;
    }
    if (typeof delta.text === 'string' && delta.text) return delta.text;
    return '';
  }

  const message = asRecord(choice?.message);
  if (typeof message?.content === 'string') return message.content;
  if (typeof choice?.text === 'string') return choice.text;
  return '';
}

function extractToken(parsed: UnknownRecord, already: string): string {
  const openai = extractOpenAiDelta(parsed);
  if (openai) {
    if (already && openai.startsWith(already) && openai.length >= already.length) {
      return openai.slice(already.length);
    }
    return openai;
  }

  const accumulated =
    (typeof parsed.response === 'string' && parsed.response) ||
    (typeof parsed.completion === 'string' && parsed.completion) ||
    '';
  if (accumulated) {
    if (already && accumulated.startsWith(already)) return accumulated.slice(already.length);
    if (!already) return accumulated;
  }

  for (const key of ['token', 'chunk', 'content', 'text'] as const) {
    const value = parsed[key];
    if (typeof value !== 'string' || !value) continue;
    if (already && value.startsWith(already)) return value.slice(already.length);
    return value;
  }
  return '';
}

/** Without `stream: true` the backend answers with plain JSON `{ success, response }`. */
function nonStreamText(data: UnknownRecord): string {
  if (typeof data.response === 'string') return data.response;
  if (typeof data.completion === 'string') return data.completion;
  const fromChoices = extractOpenAiDelta(data);
  return fromChoices || '';
}

const DRIP_CHARS = 20;

function yieldPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 16);
  });
}

/** Reveal text a slice at a time so a buffered SSE body still paints progressively. */
async function emitStreamText(
  token: string,
  abortSignal: AbortSignal,
  apply: (piece: string) => void
): Promise<void> {
  if (!token || abortSignal.aborted) return;
  if (token.length <= DRIP_CHARS) {
    apply(token);
    await yieldPaint();
    return;
  }
  for (let index = 0; index < token.length; index += DRIP_CHARS) {
    if (abortSignal.aborted) return;
    apply(token.slice(index, index + DRIP_CHARS));
    await yieldPaint();
  }
}

// ---------------------------------------------------------------------------
// Диагностика: отвечает на вопрос «почему ответ появился целиком»
// Отключается через localStorage.setItem('debug:chat-stream', 'off')
// ---------------------------------------------------------------------------

const DEBUG_FLAG = 'debug:chat-stream';
/** Размер среза, которым бэкенд отдаёт готовый ответ на пути с tools. */
const TOOL_SLICE_SIZE = 48;
const SAMPLED_FRAMES = 6;

function debugEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(DEBUG_FLAG) !== 'off';
  } catch {
    return true;
  }
}

interface StreamDiagnostics {
  frames: number;
  firstAt: number;
  lastAt: number;
  lengths: number[];
}

function reportStream(
  diagnostics: StreamDiagnostics,
  label: string,
  startedAt: number,
  aborted: boolean
): void {
  if (!debugEnabled()) return;

  const totalMs = Math.round(performance.now() - startedAt);
  if (diagnostics.frames === 0) {
    console.warn(`[${label}] ни одного кадра с текстом за ${totalMs}мс`);
    return;
  }

  const waitMs = Math.round(diagnostics.firstAt - startedAt);
  const streamMs = Math.round(diagnostics.lastAt - diagnostics.firstAt);
  // Много кадров, уместившихся в момент, — тело добралось до нас одним куском.
  const burst = diagnostics.frames > 5 && streamMs < 500;
  const sampled = diagnostics.lengths;
  const sliced =
    sampled.length >= 3 &&
    sampled.slice(0, -1).every((length) => length === TOOL_SLICE_SIZE);

  const verdict = aborted
    ? 'остановлено пользователем'
    : sliced && burst
      ? `бэкенд нарезал готовый ответ по ${TOOL_SLICE_SIZE} символов (путь с tools) — живого стрима тут нет`
      : burst
        ? 'тело пришло одним куском — буферизация на сервере/прокси (gzip или proxy_buffering для text/event-stream)'
        : 'кадры шли постепенно — транспорт в порядке';

  console.debug(
    `[${label}] ${diagnostics.frames} кадров · всего ${totalMs}мс · первый кадр +${waitMs}мс · ` +
      `поток ${streamMs}мс · длины ${sampled.join(',')} · ${verdict}`
  );
}

/**
 * Reader for POST /api/chat and /api/chat/with-tools (OpenAI chunks).
 *
 * Frames: `data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"…"}}]}`
 * End:    `data: [DONE]` — never parsed as JSON.
 *
 * Do NOT use this for RAG `/query/stream`: those frames carry `type: chunk | final`
 * and have no `choices[0].delta`, so this reader would render nothing.
 */
export async function consumeChatStream(
  response: Response,
  abortSignal: AbortSignal,
  onChunk: StreamChunkHandler,
  onComplete?: (fullResponse: string) => void,
  options: ChatStreamOptions = {}
): Promise<void> {
  const label = options.label ?? 'chat-stream';
  const startedAt = options.requestStartedAt ?? performance.now();

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') && !contentType.includes('event-stream')) {
    if (debugEnabled()) {
      console.warn(
        `[${label}] сервер ответил "${contentType}" вместо text/event-stream — ` +
          'ответ придёт целиком (stream:true проигнорирован)'
      );
    }
    const data = (await response.json()) as UnknownRecord;
    const text = nonStreamText(data);
    let shown = '';
    await emitStreamText(text, abortSignal, (piece) => {
      shown += piece;
      onChunk(piece, shown);
    });
    if (!abortSignal.aborted) onComplete?.(shown || text);
    return;
  }

  let fullResponse = '';
  let finished = false;
  const diagnostics: StreamDiagnostics = { frames: 0, firstAt: 0, lastAt: 0, lengths: [] };

  const finish = () => {
    if (finished) return;
    finished = true;
    if (!abortSignal.aborted) onComplete?.(fullResponse);
  };

  await readSseFrames(
    response,
    async (payload) => {
      if (payload === '[DONE]') {
        finish();
        return 'stop';
      }

      let parsed: UnknownRecord;
      try {
        parsed = JSON.parse(payload) as UnknownRecord;
      } catch {
        return;
      }

      const token = extractToken(parsed, fullResponse);
      if (!token) return;

      const now = performance.now();
      if (diagnostics.frames === 0) diagnostics.firstAt = now;
      diagnostics.lastAt = now;
      diagnostics.frames += 1;
      if (diagnostics.lengths.length < SAMPLED_FRAMES) {
        diagnostics.lengths.push(token.length);
      }

      await emitStreamText(token, abortSignal, (piece) => {
        fullResponse += piece;
        onChunk(piece, fullResponse);
      });
    },
    abortSignal
  );

  reportStream(diagnostics, label, startedAt, abortSignal.aborted);
  finish();
}

/** @deprecated Use consumeChatStream. Kept for existing chat/inference call sites. */
export const consumeModelStream = consumeChatStream;
