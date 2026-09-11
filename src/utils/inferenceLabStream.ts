import type { UnknownRecord } from '../types';
import { readSseFrames } from './sseStream';

/**
 * SSE for POST /api/inference-lab/run.
 * Frames: { type: meta | token | done | error }.
 * Not OpenAI choices[0].delta and not RAG type:chunk.
 */

export interface InferenceLabMetaFrame {
  type: 'meta';
  requestId: string;
  responseId?: string;
  model?: string;
  mode?: string;
}

export interface InferenceLabTokenFrame {
  type: 'token';
  content: string;
  requestId?: string;
}

export interface InferenceLabDoneFrame {
  type: 'done';
  requestId?: string;
  status?: string;
  latencyMs?: number;
  ttftMs?: number;
  chunkCount?: number;
  usage?: UnknownRecord;
  response?: UnknownRecord;
}

export interface InferenceLabErrorFrame {
  type: 'error';
  error: string;
  requestId?: string;
}

export type InferenceLabStreamFrame =
  | InferenceLabMetaFrame
  | InferenceLabTokenFrame
  | InferenceLabDoneFrame
  | InferenceLabErrorFrame;

export interface InferenceLabStreamHandlers {
  onMeta?: (frame: InferenceLabMetaFrame) => void;
  onToken?: (content: string, fullText: string) => void;
  onDone?: (frame: InferenceLabDoneFrame, fullText: string) => void;
  onError?: (message: string) => void;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

export function parseInferenceLabFrame(payload: string): InferenceLabStreamFrame | null {
  let parsed: UnknownRecord;
  try {
    parsed = JSON.parse(payload) as UnknownRecord;
  } catch {
    return null;
  }

  const type = asString(parsed.type);
  if (type === 'meta') {
    const requestId = asString(parsed.requestId) ?? asString(parsed.request_id) ?? '';
    return {
      type: 'meta',
      requestId,
      responseId: asString(parsed.responseId) ?? asString(parsed.response_id),
      model: asString(parsed.model),
      mode: asString(parsed.mode),
    };
  }
  if (type === 'token') {
    const content = asString(parsed.content) ?? '';
    if (!content) return null;
    return {
      type: 'token',
      content,
      requestId: asString(parsed.requestId) ?? asString(parsed.request_id),
    };
  }
  if (type === 'done') {
    return {
      type: 'done',
      requestId: asString(parsed.requestId) ?? asString(parsed.request_id),
      status: asString(parsed.status),
      latencyMs: asNumber(parsed.latencyMs) ?? asNumber(parsed.latency_ms),
      ttftMs: asNumber(parsed.ttftMs) ?? asNumber(parsed.ttft_ms),
      chunkCount: asNumber(parsed.chunkCount) ?? asNumber(parsed.chunk_count),
      usage: asRecord(parsed.usage),
      response: asRecord(parsed.response),
    };
  }
  if (type === 'error') {
    return {
      type: 'error',
      error: asString(parsed.error) ?? 'Ошибка инференса',
      requestId: asString(parsed.requestId) ?? asString(parsed.request_id),
    };
  }
  return null;
}

export async function consumeInferenceLabStream(
  response: Response,
  abortSignal: AbortSignal,
  handlers: InferenceLabStreamHandlers
): Promise<string> {
  let fullText = '';
  let finished = false;

  await readSseFrames(
    response,
    (payload) => {
      if (payload === '[DONE]') {
        finished = true;
        return 'stop';
      }

      const frame = parseInferenceLabFrame(payload);
      if (!frame) return;

      if (frame.type === 'meta') {
        handlers.onMeta?.(frame);
        return;
      }
      if (frame.type === 'token') {
        fullText += frame.content;
        handlers.onToken?.(frame.content, fullText);
        return;
      }
      if (frame.type === 'done') {
        finished = true;
        handlers.onDone?.(frame, fullText);
        return 'stop';
      }
      handlers.onError?.(frame.error);
      finished = true;
      return 'stop';
    },
    abortSignal
  );

  if (!finished && !abortSignal.aborted) {
    handlers.onDone?.({ type: 'done', status: 'completed' }, fullText);
  }

  return fullText;
}
