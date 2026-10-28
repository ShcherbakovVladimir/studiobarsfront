import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { applyHighContrast, saveTheme } from '../lib/theme';
import {
  applyPalette,
  DEFAULT_PALETTE,
  isPaletteId,
  savePalette,
} from '../lib/palettes';
import {
  applyFontPairing,
  DEFAULT_FONT_PAIRING,
  ensureFontStylesheet,
  isFontPairingId,
  saveFontPairing,
} from '../lib/fonts';

/** Sync Redux theme / palette / fonts / contrast to documentElement. */
export function useThemeSync(): void {
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const paletteId = useSelector((state: RootState) => state.app.paletteId);
  const fontPairingId = useSelector((state: RootState) => state.app.fontPairingId);
  const highContrast = useSelector((state: RootState) => state.app.highContrast);

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

  useEffect(() => {
    const id = isFontPairingId(fontPairingId) ? fontPairingId : DEFAULT_FONT_PAIRING;
    ensureFontStylesheet(id);
    applyFontPairing(id);
    saveFontPairing(id);
  }, [fontPairingId]);

  useEffect(() => {
    applyHighContrast(highContrast);
  }, [highContrast]);
}
