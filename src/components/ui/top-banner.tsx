import { cn } from '../../lib/utils';

type BannerVariant = 'error' | 'success' | 'warning' | 'info';

const variantClasses: Record<BannerVariant, { container: string; text: string; action: string }> = {
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400',
    action: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50',
  },
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400',
    action: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    action: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    text: 'text-primary',
    action: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50',
  },
};

interface TopBannerProps {
  variant?: BannerVariant;
  message: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
  className?: string;
}

export function TopBanner({
  variant = 'error',
  message,
  action,
  icon,
  className,
}: TopBannerProps) {
  const styles = variantClasses[variant];

  return (
    <div
      className={cn(
        'border-b px-4 py-2 shrink-0',
        styles.container,
        className
      )}
    >
      <div className="flex items-center justify-between w-full gap-3">
        <div className={cn('flex items-center gap-2 text-sm', styles.text)}>
          {icon}
          <span>{message}</span>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn('text-xs px-2 py-1 rounded transition-colors shrink-0', styles.action)}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
