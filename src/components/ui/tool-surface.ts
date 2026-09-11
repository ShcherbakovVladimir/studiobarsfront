import { cn } from '../../lib/utils';

export const toolCard =
  'min-w-0 overflow-hidden rounded-2xl border border-border bg-background/50 p-3 sm:p-4';

/** Rounded code/preview: clip the scrollbar to the radius. */
export const toolPreShell =
  'min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background/60';

export const toolPreBody =
  'overflow-auto max-h-80 p-3 text-xs font-mono break-all scroll-clip';

export const toolTitle = 'text-sm font-semibold text-foreground';

export const toolBtn =
  'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none';

export const toolBtnPrimary = cn(toolBtn, 'btn-gradient text-white');

export const toolBtnGhost = cn(toolBtn, 'bg-accent hover:bg-border text-foreground');

export const toolBtnDanger = cn(toolBtn, 'text-destructive hover:bg-destructive/10');

export const tabChip = (active: boolean) =>
  cn(
    'px-2.5 h-7 rounded-lg text-xs transition-colors',
    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-border/80'
  );
