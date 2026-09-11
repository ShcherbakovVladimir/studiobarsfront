const THEME_STORAGE_KEY = '__STUDIOXLAM_THEME__';

/** `true` = dark, `false` = light */
export function loadSavedTheme(): boolean | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
    return null;
  } catch {
    return null;
  }
}

export function saveTheme(isDarkMode: boolean): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export function resolveInitialTheme(): boolean {
  const saved = loadSavedTheme();
  if (saved !== null) return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}
