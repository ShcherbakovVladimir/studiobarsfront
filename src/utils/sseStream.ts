/**
 * Shared SSE transport for POST-based streams (fetch, not EventSource).
 *
 * Frames: `data: …` lines. A frame may be split across packets; trailing
 * incomplete lines stay in the buffer. `onFrame` may be async so callers can
 * yield to the UI between tokens (gzip / proxy often deliver the whole body
 * in one `read()`).
 */

/** Return `'stop'` to close the stream early (e.g. after `[DONE]`). */
export type SseFrameHandler = (payload: string) => 'stop' | void | Promise<'stop' | void>;

export async function readSseFrames(
  response: Response,
  onFrame: SseFrameHandler,
  abortSignal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let stopped = false;

  const handleLine = async (raw: string): Promise<boolean> => {
    const line = raw.trimEnd();
    if (!line.startsWith('data:')) return false;
    const payload = line.replace(/^data:\s*/, '').trim();
    if (!payload) return false;
    return (await onFrame(payload)) === 'stop';
  };

  try {
    while (!abortSignal?.aborted && !stopped) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          if (await handleLine(raw)) {
            stopped = true;
            break;
          }
        }
      }

      if (done) break;
    }

    if (!stopped && buffer.trim()) {
      await handleLine(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
