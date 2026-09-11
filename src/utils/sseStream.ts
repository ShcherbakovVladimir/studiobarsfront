/**
 * Shared SSE transport for POST-based streams (fetch, not EventSource).
 *
 * Only the transport is shared: frames arrive as `data: …\n\n` and lines without
 * the `data:` prefix are skipped. Decoding the JSON inside `data:` is protocol
 * specific — chat (`choices[0].delta.content`) and RAG (`type: chunk | final`)
 * are incompatible and must never share a decoder.
 */

/** Return `'stop'` to close the stream early (e.g. after `[DONE]`). */
export type SseFrameHandler = (payload: string) => 'stop' | void;

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

  const handleLine = (raw: string): boolean => {
    const line = raw.trimEnd();
    if (!line.startsWith('data:')) return false;
    const payload = line.replace(/^data:\s*/, '').trim();
    if (!payload) return false;
    return onFrame(payload) === 'stop';
  };

  try {
    while (!abortSignal?.aborted && !stopped) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        // Keep the trailing fragment: a frame may be split across packets.
        buffer = lines.pop() ?? '';

        for (const raw of lines) {
          if (handleLine(raw)) {
            stopped = true;
            break;
          }
        }
      }

      if (done) break;
    }

    if (!stopped && buffer.trim()) {
      handleLine(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
