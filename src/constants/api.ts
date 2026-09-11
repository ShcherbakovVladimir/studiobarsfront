/** StudioXLAM backend (lm host). barsseek/studioxlam frontends are NOT the API. */
export const DEFAULT_CHAT_API_BASE = 'https://lm.almaz-t.ru/api';
export const DEFAULT_RAG_API_BASE = 'https://lm.almaz-t.ru';

/** Hostnames that serve SPA only — never use as chat API base from /api/config */
const FRONTEND_ONLY_HOSTS = new Set([
  'barsseek.almaz-t.ru',
  'studioxlam.almaz-t.ru',
  'www.barsseek.almaz-t.ru',
  'www.studioxlam.almaz-t.ru',
]);

function normalizeApiBase(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function hostnameFromApiBase(url: string): string | null {
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Reject frontend SPA hosts mistakenly returned as chatApiUrl from backend config */
export function isBackendApiBase(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  const host = hostnameFromApiBase(url.trim());
  if (!host) return false;
  if (FRONTEND_ONLY_HOSTS.has(host)) return false;
  return true;
}

export function resolveEnvChatApiBase(): string | undefined {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!fromEnv || fromEnv === '/api') return undefined;
  const normalized = normalizeApiBase(fromEnv);
  return isBackendApiBase(normalized) ? normalized : DEFAULT_CHAT_API_BASE;
}

export function resolveEnvRagApiBase(): string | undefined {
  const fromEnv = import.meta.env.VITE_RAG_API_URL?.trim();
  if (!fromEnv) return undefined;
  const normalized = normalizeApiBase(fromEnv);
  return isBackendApiBase(normalized) ? normalized : DEFAULT_RAG_API_BASE;
}

/** Env > valid config URL > lm default. Ignores barsseek/studioxlam from /api/config */
export function resolveChatApiBase(configUrl?: string): string {
  const fromEnv = resolveEnvChatApiBase();
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return 'http://localhost:3001/api';
    }
  }

  if (configUrl && isBackendApiBase(configUrl)) return normalizeApiBase(configUrl);
  return DEFAULT_CHAT_API_BASE;
}

export function resolveRagApiBase(configUrl?: string): string {
  const fromEnv = resolveEnvRagApiBase();
  if (fromEnv) return fromEnv;
  if (configUrl && isBackendApiBase(configUrl)) return normalizeApiBase(configUrl);
  return DEFAULT_RAG_API_BASE;
}

