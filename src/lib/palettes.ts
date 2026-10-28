/** Switchable accent palettes (light + dark). Neutral chrome stays in index.css. */

export const PALETTE_IDS = [
  'teal',
  'ocean',
  'forest',
  'amber',
  'slate',
  'coral',
  'indigo',
  'lime',
  'copper',
  'steel',
  'deepseek',
  'grok',
  'gpt',
  'cursor',
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export const DEFAULT_PALETTE: PaletteId = 'teal';

export const PALETTE_LABELS: Record<PaletteId, string> = {
  teal: 'Бирюза',
  ocean: 'Океан',
  forest: 'Лес',
  amber: 'Янтарь',
  slate: 'Сланец',
  coral: 'Коралл',
  indigo: 'Индиго',
  lime: 'Лайм',
  copper: 'Медь',
  steel: 'Сталь',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  gpt: 'GPT',
  cursor: 'Cursor',
};

/** Swatch for picker UI (light-mode primary). */
export const PALETTE_SWATCH: Record<PaletteId, string> = {
  teal: '#0d9488',
  ocean: '#0284c7',
  forest: '#16a34a',
  amber: '#d97706',
  slate: '#475569',
  coral: '#ea580c',
  indigo: '#4f46e5',
  lime: '#65a30d',
  copper: '#c2410c',
  steel: '#0e7490',
  deepseek: '#4d6bfe',
  grok: '#1a1a1a',
  gpt: '#10a37f',
  cursor: '#f54e00',
};

type AccentTokens = {
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  primaryActive: string;
  accent: string;
  accentForeground: string;
  ring: string;
  chart1: string;
  chart2: string;
};

const LIGHT: Record<PaletteId, AccentTokens> = {
  teal: {
    primary: '#0d9488',
    primaryForeground: '#ffffff',
    primaryHover: '#0f766e',
    primaryActive: '#115e59',
    accent: '#e6f7f5',
    accentForeground: '#134e4a',
    ring: '#0d9488',
    chart1: '#0d9488',
    chart2: '#0f766e',
  },
  ocean: {
    primary: '#0284c7',
    primaryForeground: '#ffffff',
    primaryHover: '#0369a1',
    primaryActive: '#075985',
    accent: '#e0f2fe',
    accentForeground: '#0c4a6e',
    ring: '#0284c7',
    chart1: '#0284c7',
    chart2: '#0369a1',
  },
  forest: {
    primary: '#16a34a',
    primaryForeground: '#ffffff',
    primaryHover: '#15803d',
    primaryActive: '#166534',
    accent: '#dcfce7',
    accentForeground: '#14532d',
    ring: '#16a34a',
    chart1: '#16a34a',
    chart2: '#15803d',
  },
  amber: {
    primary: '#d97706',
    primaryForeground: '#ffffff',
    primaryHover: '#b45309',
    primaryActive: '#92400e',
    accent: '#fef3c7',
    accentForeground: '#78350f',
    ring: '#d97706',
    chart1: '#d97706',
    chart2: '#b45309',
  },
  slate: {
    primary: '#475569',
    primaryForeground: '#ffffff',
    primaryHover: '#334155',
    primaryActive: '#1e293b',
    accent: '#e2e8f0',
    accentForeground: '#1e293b',
    ring: '#475569',
    chart1: '#475569',
    chart2: '#334155',
  },
  coral: {
    primary: '#ea580c',
    primaryForeground: '#ffffff',
    primaryHover: '#c2410c',
    primaryActive: '#9a3412',
    accent: '#ffedd5',
    accentForeground: '#7c2d12',
    ring: '#ea580c',
    chart1: '#ea580c',
    chart2: '#c2410c',
  },
  indigo: {
    primary: '#4f46e5',
    primaryForeground: '#ffffff',
    primaryHover: '#4338ca',
    primaryActive: '#3730a3',
    accent: '#e0e7ff',
    accentForeground: '#312e81',
    ring: '#4f46e5',
    chart1: '#4f46e5',
    chart2: '#4338ca',
  },
  lime: {
    primary: '#65a30d',
    primaryForeground: '#ffffff',
    primaryHover: '#4d7c0f',
    primaryActive: '#3f6212',
    accent: '#ecfccb',
    accentForeground: '#365314',
    ring: '#65a30d',
    chart1: '#65a30d',
    chart2: '#4d7c0f',
  },
  copper: {
    primary: '#c2410c',
    primaryForeground: '#ffffff',
    primaryHover: '#9a3412',
    primaryActive: '#7c2d12',
    accent: '#ffedd5',
    accentForeground: '#7c2d12',
    ring: '#c2410c',
    chart1: '#c2410c',
    chart2: '#9a3412',
  },
  steel: {
    primary: '#0e7490',
    primaryForeground: '#ffffff',
    primaryHover: '#155e75',
    primaryActive: '#164e63',
    accent: '#cffafe',
    accentForeground: '#164e63',
    ring: '#0e7490',
    chart1: '#0e7490',
    chart2: '#155e75',
  },
  /** DeepSeek brand blue */
  deepseek: {
    primary: '#4d6bfe',
    primaryForeground: '#ffffff',
    primaryHover: '#3b5bdb',
    primaryActive: '#2f4ac4',
    accent: '#eef1ff',
    accentForeground: '#1e2a6b',
    ring: '#4d6bfe',
    chart1: '#4d6bfe',
    chart2: '#3b5bdb',
  },
  /** Grok / xAI — stark black */
  grok: {
    primary: '#1a1a1a',
    primaryForeground: '#fafafa',
    primaryHover: '#000000',
    primaryActive: '#0a0a0a',
    accent: '#f4f4f5',
    accentForeground: '#18181b',
    ring: '#3f3f46',
    chart1: '#1a1a1a',
    chart2: '#52525b',
  },
  /** ChatGPT green */
  gpt: {
    primary: '#10a37f',
    primaryForeground: '#ffffff',
    primaryHover: '#0d8c6d',
    primaryActive: '#0a7359',
    accent: '#e7f8f3',
    accentForeground: '#0a3d32',
    ring: '#10a37f',
    chart1: '#10a37f',
    chart2: '#0d8c6d',
  },
  /** Cursor — warm orange accent */
  cursor: {
    primary: '#f54e00',
    primaryForeground: '#ffffff',
    primaryHover: '#d94300',
    primaryActive: '#b83900',
    accent: '#fff1eb',
    accentForeground: '#5c1f00',
    ring: '#f54e00',
    chart1: '#f54e00',
    chart2: '#d94300',
  },
};

const DARK: Record<PaletteId, AccentTokens> = {
  teal: {
    primary: '#2dd4bf',
    primaryForeground: '#042f2e',
    primaryHover: '#14b8a6',
    primaryActive: '#0d9488',
    accent: '#134e4a',
    accentForeground: '#ccfbf1',
    ring: '#2dd4bf',
    chart1: '#2dd4bf',
    chart2: '#14b8a6',
  },
  ocean: {
    primary: '#38bdf8',
    primaryForeground: '#082f49',
    primaryHover: '#0ea5e9',
    primaryActive: '#0284c7',
    accent: '#0c4a6e',
    accentForeground: '#e0f2fe',
    ring: '#38bdf8',
    chart1: '#38bdf8',
    chart2: '#0ea5e9',
  },
  forest: {
    primary: '#4ade80',
    primaryForeground: '#052e16',
    primaryHover: '#22c55e',
    primaryActive: '#16a34a',
    accent: '#14532d',
    accentForeground: '#dcfce7',
    ring: '#4ade80',
    chart1: '#4ade80',
    chart2: '#22c55e',
  },
  amber: {
    primary: '#fbbf24',
    primaryForeground: '#451a03',
    primaryHover: '#f59e0b',
    primaryActive: '#d97706',
    accent: '#78350f',
    accentForeground: '#fef3c7',
    ring: '#fbbf24',
    chart1: '#fbbf24',
    chart2: '#f59e0b',
  },
  slate: {
    primary: '#94a3b8',
    primaryForeground: '#0f172a',
    primaryHover: '#cbd5e1',
    primaryActive: '#64748b',
    accent: '#1e293b',
    accentForeground: '#e2e8f0',
    ring: '#94a3b8',
    chart1: '#94a3b8',
    chart2: '#cbd5e1',
  },
  coral: {
    primary: '#fb923c',
    primaryForeground: '#431407',
    primaryHover: '#f97316',
    primaryActive: '#ea580c',
    accent: '#7c2d12',
    accentForeground: '#ffedd5',
    ring: '#fb923c',
    chart1: '#fb923c',
    chart2: '#f97316',
  },
  indigo: {
    primary: '#818cf8',
    primaryForeground: '#1e1b4b',
    primaryHover: '#6366f1',
    primaryActive: '#4f46e5',
    accent: '#312e81',
    accentForeground: '#e0e7ff',
    ring: '#818cf8',
    chart1: '#818cf8',
    chart2: '#6366f1',
  },
  lime: {
    primary: '#a3e635',
    primaryForeground: '#1a2e05',
    primaryHover: '#84cc16',
    primaryActive: '#65a30d',
    accent: '#365314',
    accentForeground: '#ecfccb',
    ring: '#a3e635',
    chart1: '#a3e635',
    chart2: '#84cc16',
  },
  copper: {
    primary: '#fb923c',
    primaryForeground: '#431407',
    primaryHover: '#f97316',
    primaryActive: '#c2410c',
    accent: '#7c2d12',
    accentForeground: '#ffedd5',
    ring: '#fb923c',
    chart1: '#fb923c',
    chart2: '#f97316',
  },
  steel: {
    primary: '#22d3ee',
    primaryForeground: '#083344',
    primaryHover: '#06b6d4',
    primaryActive: '#0e7490',
    accent: '#164e63',
    accentForeground: '#cffafe',
    ring: '#22d3ee',
    chart1: '#22d3ee',
    chart2: '#06b6d4',
  },
  deepseek: {
    primary: '#6b85ff',
    primaryForeground: '#0b1240',
    primaryHover: '#4d6bfe',
    primaryActive: '#3b5bdb',
    accent: '#1a2258',
    accentForeground: '#eef1ff',
    ring: '#6b85ff',
    chart1: '#6b85ff',
    chart2: '#4d6bfe',
  },
  grok: {
    primary: '#e5e5e5',
    primaryForeground: '#0a0a0a',
    primaryHover: '#f5f5f5',
    primaryActive: '#d4d4d4',
    accent: '#27272a',
    accentForeground: '#fafafa',
    ring: '#a1a1aa',
    chart1: '#e5e5e5',
    chart2: '#a1a1aa',
  },
  gpt: {
    primary: '#2ee6b3',
    primaryForeground: '#042f26',
    primaryHover: '#10a37f',
    primaryActive: '#0d8c6d',
    accent: '#0a3d32',
    accentForeground: '#e7f8f3',
    ring: '#2ee6b3',
    chart1: '#2ee6b3',
    chart2: '#10a37f',
  },
  cursor: {
    primary: '#ff6624',
    primaryForeground: '#2a0e00',
    primaryHover: '#f54e00',
    primaryActive: '#d94300',
    accent: '#3d1600',
    accentForeground: '#fff1eb',
    ring: '#ff6624',
    chart1: '#ff6624',
    chart2: '#f54e00',
  },
};

const PALETTE_STORAGE_KEY = 'studio_palette';
const PALETTE_STORAGE_LEGACY = '__STUDIOXLAM_PALETTE__';

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && (PALETTE_IDS as readonly string[]).includes(value);
}

export function loadSavedPalette(): PaletteId {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY) ?? localStorage.getItem(PALETTE_STORAGE_LEGACY);
    if (isPaletteId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE;
}

export function savePalette(id: PaletteId): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
    localStorage.setItem(PALETTE_STORAGE_LEGACY, id);
  } catch {
    /* ignore */
  }
}

/** Apply accent CSS variables for the active palette + light/dark mode. */
export function applyPalette(id: PaletteId, isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const tokens = isDark ? DARK[id] : LIGHT[id];
  const root = document.documentElement;
  root.dataset.palette = id;
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--primary-hover', tokens.primaryHover);
  root.style.setProperty('--primary-active', tokens.primaryActive);
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--accent-foreground', tokens.accentForeground);
  root.style.setProperty('--ring', tokens.ring);
  root.style.setProperty('--chart-1', tokens.chart1);
  root.style.setProperty('--chart-2', tokens.chart2);
  root.style.setProperty('--sidebar-primary', tokens.primary);
  root.style.setProperty('--sidebar-primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--sidebar-accent', tokens.accent);
  root.style.setProperty('--sidebar-accent-foreground', tokens.accentForeground);
  root.style.setProperty('--sidebar-ring', tokens.ring);
}
