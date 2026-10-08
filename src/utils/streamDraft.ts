/**
 * Текст текущего ответа, пока идёт стрим.
 * Кадр SSE не пишет в Redux: иначе каждый токен перерисовывает всю страницу.
 * Подписчик получает текст не чаще одного раза за кадр экрана.
 * У лаборатории и RAG отдельные каналы, чтобы ответы не смешивались.
 */

interface TextDraft {
  publish: (value: string) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  get: () => string;
}

function createTextDraft(): TextDraft {
  let current = '';
  let scheduled = false;
  let frameId = 0;
  const listeners = new Set<() => void>();

  return {
    publish(value: string) {
      current = value;
      if (scheduled) return;
      scheduled = true;
      frameId = requestAnimationFrame(() => {
        scheduled = false;
        listeners.forEach((listener) => listener());
      });
    },
    reset() {
      current = '';
      if (scheduled) cancelAnimationFrame(frameId);
      scheduled = false;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get() {
      return current;
    },
  };
}

const agentDraft = createTextDraft();
export const publishStreamDraft = agentDraft.publish;
export const resetStreamDraft = agentDraft.reset;
export const subscribeStreamDraft = agentDraft.subscribe;
export const getStreamDraft = agentDraft.get;

const ragDraft = createTextDraft();
export const publishRagStreamDraft = ragDraft.publish;
export const resetRagStreamDraft = ragDraft.reset;
export const subscribeRagStreamDraft = ragDraft.subscribe;
export const getRagStreamDraft = ragDraft.get;
