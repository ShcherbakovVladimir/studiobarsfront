import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { saveTheme } from '../lib/theme';

/** Sync Redux theme to document.documentElement (Tailwind dark: variant). */
export function useThemeSync(): void {
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    saveTheme(isDarkMode);
  }, [isDarkMode]);
}
