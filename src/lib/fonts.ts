/** 6 font pairings: 1 display + 1 body + 1 mono (2+1 rule). */

export const FONT_PAIRING_IDS = [
  'bricolage',
  'outfit',
  'urbanist',
  'manrope',
  'fraunces',
  'archivo',
] as const;

export type FontPairingId = (typeof FONT_PAIRING_IDS)[number];

export const DEFAULT_FONT_PAIRING: FontPairingId = 'bricolage';

export const FONT_PAIRING_LABELS: Record<FontPairingId, string> = {
  bricolage: 'Bricolage · Manrope',
  outfit: 'Outfit · Jakarta',
  urbanist: 'Urbanist · DM Sans',
  manrope: 'Manrope',
  fraunces: 'Fraunces · DM Sans',
  archivo: 'Archivo · Plex Mono',
};

type FontTokens = {
  display: string;
  sans: string;
  mono: string;
  /** Google Fonts family query fragment */
  google: string;
};

export const FONT_PAIRINGS: Record<FontPairingId, FontTokens> = {
  bricolage: {
    display: '"Bricolage Grotesque", system-ui, sans-serif',
    sans: '"Manrope", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    google:
      'family=Bricolage+Grotesque:opsz,wght@12..96,400;500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
  },
  outfit: {
    display: '"Outfit", system-ui, sans-serif',
    sans: '"Plus Jakarta Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    google:
      'family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
  },
  urbanist: {
    display: '"Urbanist", system-ui, sans-serif',
    sans: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    google:
      'family=Urbanist:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
  },
  manrope: {
    display: '"Manrope", system-ui, sans-serif',
    sans: '"Manrope", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    google: 'family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
  },
  fraunces: {
    display: '"Fraunces", Georgia, serif',
    sans: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    google:
      'family=Fraunces:opsz,wght@9..144,400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
  },
  archivo: {
    display: '"Archivo", system-ui, sans-serif',
    sans: '"Archivo", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
    google: 'family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500',
  },
};

const FONT_STORAGE_KEY = 'studio_font_pairing';
const FONT_STORAGE_LEGACY = '__STUDIOXLAM_FONT__';

export function isFontPairingId(value: unknown): value is FontPairingId {
  return typeof value === 'string' && (FONT_PAIRING_IDS as readonly string[]).includes(value);
}

export function loadSavedFontPairing(): FontPairingId {
  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY) ?? localStorage.getItem(FONT_STORAGE_LEGACY);
    if (isFontPairingId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_FONT_PAIRING;
}

export function saveFontPairing(id: FontPairingId): void {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, id);
    localStorage.setItem(FONT_STORAGE_LEGACY, id);
  } catch {
    /* ignore */
  }
}

export function applyFontPairing(id: FontPairingId): void {
  if (typeof document === 'undefined') return;
  const tokens = FONT_PAIRINGS[id];
  const root = document.documentElement;
  root.dataset.font = id;
  root.style.setProperty('--font-display', tokens.display);
  root.style.setProperty('--font-sans', tokens.sans);
  root.style.setProperty('--font-mono', tokens.mono);
  root.style.setProperty('--font-serif', tokens.display);
}

/** Ensure Google Fonts stylesheet for pairing is present (idempotent). */
export function ensureFontStylesheet(id: FontPairingId): void {
  if (typeof document === 'undefined') return;
  const linkId = `studio-font-${id}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${FONT_PAIRINGS[id].google}&display=swap`;
  document.head.appendChild(link);
}
