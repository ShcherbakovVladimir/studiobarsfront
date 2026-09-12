import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_KEY = 'barsseek:chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export function reloadOnceOnStaleChunk(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/** After a deploy, old lazy URLs 404. Reload once so index.html picks up new hashes. */
export function installVitePreloadReload(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceOnStaleChunk();
  });
}

export function lazyWithRetry<P extends object>(
  importer: () => Promise<{ default: ComponentType<P> }>
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    try {
      const mod = await importer();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceOnStaleChunk()) {
        return new Promise<{ default: ComponentType<P> }>(() => {
          /* page is reloading */
        });
      }
      throw error;
    }
  });
}
