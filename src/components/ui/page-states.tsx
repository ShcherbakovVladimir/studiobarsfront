import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Загрузка...', className }: LoadingStateProps) {
  return (
    <div className={cn('text-sm text-muted-foreground py-8 text-center', className)}>
      {message}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, className, action }: EmptyStateProps) {
  return (
    <div className={cn('text-center text-muted-foreground py-8 px-3', className)}>
      <p>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
