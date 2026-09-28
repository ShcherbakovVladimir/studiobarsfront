const STORAGE_KEY = 'xlam-rag-query-prefs';

export const DEFAULT_QWEN_MODES = ['auto', 'thinking', 'instruct', 'coding'] as const;

export const FALLBACK_RELEVANCE_SCORE = 0.45;

export interface RagQueryPrefs {
  limit: number;
  relevanceScore: number;
  qwenMode: string;
  /** Пользователь сам двигал ползунок; иначе берётся `ragDefaults` из `/api/config`. */
  limitCustom?: boolean;
  relevanceCustom?: boolean;
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

/** Настройки поиска: сохранённые пользователем значения, остальное — из `ragDefaults` сервера. */
export function resolveRagQuerySettings(
  defaults: { limit?: number; relevanceScore?: number } | null | undefined,
): { limit: number; relevanceScore: number } {
  const saved = typeof window !== 'undefined' ? loadRagQueryPrefs() : null;
  return {
    limit: sanitizeLimit(saved?.limitCustom ? saved.limit : defaults?.limit ?? 10),
    relevanceScore: sanitizeRelevance(
      saved?.relevanceCustom ? saved.relevanceScore : defaults?.relevanceScore ?? FALLBACK_RELEVANCE_SCORE,
    ),
  };
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

export function saveRagQueryPrefs(prefs: Partial<RagQueryPrefs>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadRagQueryPrefs(), ...prefs }));
  } catch {
    /* private mode */
  }
}

export function sanitizeLimit(value: unknown, fallback = 10): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, 1, 100));
}

export function sanitizeRelevance(value: unknown, fallback = FALLBACK_RELEVANCE_SCORE): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clamp(n, 0.1, 0.95) * 100) / 100;
}
