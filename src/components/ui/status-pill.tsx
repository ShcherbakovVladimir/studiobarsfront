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

const pillClasses: Record<PillVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  neutral: 'bg-muted text-muted-foreground',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const dotClasses: Record<PillVariant, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  neutral: 'bg-muted-foreground',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
};

const borderedPillClasses: Record<'success' | 'error' | 'warning', string> = {
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  error:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  warning:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
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
  bordered = false,
  className,
}: StatusPillProps) {
  const borderedVariant =
    variant === 'success' || variant === 'error' || variant === 'warning' ? variant : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-full whitespace-nowrap',
        bordered && borderedVariant
          ? cn('px-2.5 py-1 border', borderedPillClasses[borderedVariant])
          : cn('px-2 py-0.5', pillClasses[variant]),
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
    <StatusPill variant={config.variant} dot bordered pulse={config.pulse}>
      {config.label}
    </StatusPill>
  );
}
