const THEME_STORAGE_KEY = 'studio_theme';
const THEME_STORAGE_LEGACY = '__STUDIOXLAM_THEME__';
const HIGH_CONTRAST_KEY = 'studio_high_contrast';

/** `true` = dark, `false` = light */
export function loadSavedTheme(): boolean | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(THEME_STORAGE_LEGACY);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
    return null;
  } catch {
    return null;
  }
}

export function saveTheme(isDarkMode: boolean): void {
  try {
    const value = isDarkMode ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, value);
    localStorage.setItem(THEME_STORAGE_LEGACY, value);
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

export function loadHighContrast(): boolean {
  try {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveHighContrast(enabled: boolean): void {
  try {
    localStorage.setItem(HIGH_CONTRAST_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function applyHighContrast(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('high-contrast', enabled);
  document.documentElement.dataset.highContrast = enabled ? '1' : '0';
}
