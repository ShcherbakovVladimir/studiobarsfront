import { cn } from '../../lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const variantClasses: Record<AlertVariant, string> = {
  error:
    'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200',
  success:
    'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  warning:
    'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info:
    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

const dismissClasses: Record<AlertVariant, string> = {
  error: 'text-red-500 hover:text-red-700 dark:hover:text-red-300',
  success: 'text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300',
  warning: 'text-amber-500 hover:text-amber-700 dark:hover:text-amber-300',
  info: 'text-blue-500 hover:text-blue-700 dark:hover:text-blue-300',
};

interface AlertBannerProps {
  variant?: AlertVariant;
  message?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
  role?: 'alert' | 'status';
}

export function AlertBanner({
  variant = 'error',
  message,
  onDismiss,
  className,
  children,
  role,
}: AlertBannerProps) {
  const content = children ?? message;
  if (!content) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm flex items-start justify-between gap-2',
        variantClasses[variant],
        className
      )}
      role={role ?? (variant === 'error' ? 'alert' : 'status')}
    >
      <div className="flex-1 min-w-0">{content}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn('shrink-0 leading-none', dismissClasses[variant])}
          aria-label="Закрыть"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function InlineError(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="error" {...props} />;
}

export function InlineSuccess(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="success" {...props} />;
}

export function InlineWarning(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="warning" {...props} />;
}

export function InlineInfo(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="info" {...props} />;
}
