const abortFns = new Set<() => void>();

/** Register an in-flight chat/RAG stream so pagehide and logout can abort it. */
export function registerActiveStream(abort: () => void): () => void {
  abortFns.add(abort);
  return () => {
    abortFns.delete(abort);
  };
}

export function abortActiveStreams(): void {
  for (const abort of [...abortFns]) {
    try {
      abort();
    } catch {
      /* ignore */
    }
  }
  abortFns.clear();
}
