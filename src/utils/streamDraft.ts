/**
 * Текст текущего ответа, пока идёт стрим.
 * Кадр SSE не пишет в Redux: иначе каждый токен перерисовывает всю страницу.
 * Подписчик получает текст не чаще одного раза за кадр экрана.
 */

let current = '';
let scheduled = false;
let frameId = 0;
const listeners = new Set<() => void>();

export function publishStreamDraft(value: string): void {
  current = value;
  if (scheduled) return;
  scheduled = true;
  frameId = requestAnimationFrame(() => {
    scheduled = false;
    listeners.forEach((listener) => listener());
  });
}

export function resetStreamDraft(): void {
  current = '';
  if (scheduled) cancelAnimationFrame(frameId);
  scheduled = false;
  listeners.forEach((listener) => listener());
}

export function subscribeStreamDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStreamDraft(): string {
  return current;
}
