import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { saveTheme } from '../lib/theme';
import {
  applyPalette,
  DEFAULT_PALETTE,
  isPaletteId,
  savePalette,
} from '../lib/palettes';

/** Sync Redux theme + palette to documentElement. */
export function useThemeSync(): void {
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const paletteId = useSelector((state: RootState) => state.app.paletteId);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    saveTheme(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const id = isPaletteId(paletteId) ? paletteId : DEFAULT_PALETTE;
    applyPalette(id, isDarkMode);
    savePalette(id);
  }, [paletteId, isDarkMode]);
}
