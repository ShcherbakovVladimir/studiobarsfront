import { ViewMode, type ViewModeType } from '../types';

/** URL paths for main app view modes (deep-linking). */
export const VIEW_MODE_PATHS: Record<ViewModeType, string> = {
  [ViewMode.CATALOG]: '/catalog',
  [ViewMode.RAG_ANALYTICS]: '/rag',
  [ViewMode.BENCHMARK]: '/benchmark',
  [ViewMode.AGENT_LAB]: '/agent-lab',
  [ViewMode.FINETUNE]: '/finetune',
  [ViewMode.INFERENCE_LAB]: '/inference',
};

const PATH_TO_VIEW_MODE: Record<string, ViewModeType> = {
  '/': ViewMode.CATALOG,
  '/chat': ViewMode.AGENT_LAB,
  ...Object.fromEntries(
    Object.entries(VIEW_MODE_PATHS).map(([mode, path]) => [path, mode as ViewModeType])
  ),
};

export const MAIN_APP_PATHS = [...Object.values(VIEW_MODE_PATHS), '/chat'];

export function pathFromViewMode(mode: ViewModeType): string {
  return VIEW_MODE_PATHS[mode] ?? '/catalog';
}

export function viewModeFromPath(pathname: string): ViewModeType | null {
  return PATH_TO_VIEW_MODE[pathname] ?? null;
}

export function isMainAppPath(pathname: string): boolean {
  return viewModeFromPath(pathname) !== null;
}

const FILL_MODES: ViewModeType[] = [
  ViewMode.CATALOG,
  ViewMode.AGENT_LAB,
  ViewMode.RAG_ANALYTICS,
  ViewMode.BENCHMARK,
  ViewMode.FINETUNE,
  ViewMode.INFERENCE_LAB,
];

/** Full-bleed workspace tools that should fill the shell, not a padded document. */
export function isFillAppPath(pathname: string): boolean {
  if (
    pathname === '/system' ||
    pathname === '/hardware' ||
    pathname === '/api-tester' ||
    pathname === '/chat'
  ) {
    return true;
  }
  const mode = viewModeFromPath(pathname);
  return mode !== null && FILL_MODES.includes(mode);
}
