import { cn } from '../../lib/utils';

type RowVariant = 'success' | 'warning' | 'error';

const variantClasses: Record<RowVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
};

interface StatusRowProps {
  variant: RowVariant;
  title: string;
  description?: string;
  className?: string;
}

export function StatusRow({ variant, title, description, className }: StatusRowProps) {
  const styles = variantClasses[variant];
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg', styles.container, className)}>
      <div className={cn('w-2 h-2 rounded-full shrink-0', styles.dot)} />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
    </div>
  );
}
