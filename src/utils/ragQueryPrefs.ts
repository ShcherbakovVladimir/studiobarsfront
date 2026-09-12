const STORAGE_KEY = 'xlam-rag-query-prefs';

export const DEFAULT_QWEN_MODES = ['auto', 'thinking', 'instruct', 'coding'] as const;

export interface RagQueryPrefs {
  limit: number;
  relevanceScore: number;
  qwenMode: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeQwenMode(mode: string | undefined | null): string {
  const value = String(mode ?? 'auto').trim().toLowerCase();
  return value || 'auto';
}

export function mergeQwenModes(...lists: Array<string[] | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of [DEFAULT_QWEN_MODES as unknown as string[], ...lists]) {
    for (const raw of list ?? []) {
      const mode = normalizeQwenMode(raw);
      if (!mode || seen.has(mode)) continue;
      seen.add(mode);
      result.push(mode);
    }
  }
  return result;
}

export function loadRagQueryPrefs(): Partial<RagQueryPrefs> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RagQueryPrefs>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveRagQueryPrefs(prefs: RagQueryPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}

export function sanitizeLimit(value: unknown, fallback = 10): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, 1, 100));
}

export function sanitizeRelevance(value: unknown, fallback = 0.5): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, 0.1, 0.95) * 100) / 100;
}
