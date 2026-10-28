import { cn } from '../../lib/utils';

type PillVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'purple'
  | 'teal'
  | 'indigo'
  | 'amber'
  | 'green'
  | 'blue';

/** Anti-slop: metadata as plain text, not colored capsules. */
const textTone: Record<PillVariant, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  error: 'text-red-700 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-foreground',
  neutral: 'text-muted-foreground',
  purple: 'text-foreground',
  teal: 'text-primary',
  indigo: 'text-foreground',
  amber: 'text-amber-700 dark:text-amber-400',
  green: 'text-emerald-700 dark:text-emerald-400',
  blue: 'text-foreground',
};

const dotClasses: Record<PillVariant, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground',
  purple: 'bg-primary',
  teal: 'bg-primary',
  indigo: 'bg-primary',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  blue: 'bg-primary',
};

interface StatusPillProps {
  variant?: PillVariant;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  bordered?: boolean;
  className?: string;
}

export function StatusPill({
  variant = 'neutral',
  children,
  dot = false,
  pulse = false,
  bordered: _bordered = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap meta-text',
        textTone[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotClasses[variant],
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
}

type ConnectionStatus = 'online' | 'checking' | 'error' | 'offline';

const connectionConfig: Record<
  ConnectionStatus,
  { variant: 'success' | 'warning' | 'error'; label: string; pulse: boolean }
> = {
  online: { variant: 'success', label: 'Готов', pulse: true },
  checking: { variant: 'warning', label: 'Проверка...', pulse: false },
  error: { variant: 'error', label: 'Ошибка', pulse: false },
  offline: { variant: 'error', label: 'Офлайн', pulse: false },
};

export function ConnectionStatusPill({ status }: { status: ConnectionStatus }) {
  const config = connectionConfig[status];
  return (
    <StatusPill variant={config.variant} dot pulse={config.pulse}>
      {config.label}
    </StatusPill>
  );
}
