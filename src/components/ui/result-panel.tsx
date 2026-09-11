import { cn } from '../../lib/utils';

interface ResultPanelProps {
  success: boolean;
  title?: string;
  error?: string | null;
  children?: React.ReactNode;
  className?: string;
}

export function ResultPanel({ success, title, error, children, className }: ResultPanelProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 overflow-hidden',
        success
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
        className
      )}
    >
      {title && (
        <p
          className={cn(
            'font-medium',
            success
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-700 dark:text-red-300'
          )}
        >
          {title}
        </p>
      )}
      {error && (
        <p className="text-sm mt-1 text-red-600 dark:text-red-400">{error}</p>
      )}
      {children}
    </div>
  );
}
