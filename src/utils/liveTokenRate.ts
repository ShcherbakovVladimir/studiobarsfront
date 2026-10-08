/**
 * Живая скорость генерации по SSE-кадрам.
 * Короткий кадр llama — один токен. Длинный кадр — несколько токенов в одном пакете.
 */

export interface LiveTokenRate {
  tps: number | null;
  tokens: number;
}

export function countStreamTokens(text: string): number {
  if (!text) return 0;
  const chars = Array.from(text).length;
  if (chars <= 8) return 1;
  return Math.max(1, Math.round(chars / 4));
}

export function nextLiveTokenRate(
  previous: { tokens: number; firstAt: number },
  chunk: string,
  now = performance.now(),
): { tokens: number; firstAt: number; tps: number | null } {
  const added = countStreamTokens(chunk);
  if (!added) return { ...previous, tps: rateFrom(previous.tokens, previous.firstAt, now) };
  const firstAt = previous.firstAt || now;
  const tokens = previous.tokens + added;
  return { tokens, firstAt, tps: rateFrom(tokens, firstAt, now) };
}

function rateFrom(tokens: number, firstAt: number, now: number): number | null {
  if (!firstAt || tokens <= 0) return null;
  const elapsed = now - firstAt;
  if (elapsed < 200) return null;
  return tokens / (elapsed / 1000);
}

let shownRate: LiveTokenRate | null = null;
let rateScheduled = false;
const rateListeners = new Set<() => void>();

/** Скорость стрима. Слушают только подпись и панель мониторинга, не весь чат. */
export function publishLiveRate(next: LiveTokenRate | null): void {
  shownRate = next;
  if (rateScheduled) return;
  rateScheduled = true;
  requestAnimationFrame(() => {
    rateScheduled = false;
    rateListeners.forEach((listener) => listener());
  });
}

export function subscribeLiveRate(listener: () => void): () => void {
  rateListeners.add(listener);
  return () => rateListeners.delete(listener);
}

export function getLiveRate(): LiveTokenRate | null {
  return shownRate;
}
