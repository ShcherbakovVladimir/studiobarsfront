import { cn } from '../../lib/utils';

export type MetricTheme = 'default' | 'blue' | 'purple' | 'emerald' | 'amber';

const sectionClasses: Record<MetricTheme, { container: string; title: string; label: string }> = {
  default: {
    container: 'glass-panel border border-border/60',
    title: 'text-foreground/80',
    label: 'text-muted-foreground',
  },
  blue: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
    title: 'text-blue-700 dark:text-blue-300',
    label: 'text-primary',
  },
  purple: {
    container: 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800',
    title: 'text-purple-700 dark:text-purple-300',
    label: 'text-purple-600 dark:text-purple-400',
  },
  emerald: {
    container: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700',
    title: 'text-emerald-700 dark:text-emerald-300',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700',
    title: 'text-amber-800 dark:text-amber-300',
    label: 'text-amber-700 dark:text-amber-400',
  },
};

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, className }: MetricCardProps) {
  return (
    <div className={cn('min-w-0 overflow-hidden p-3 glass-panel rounded-2xl', className)}>
      <span className="text-xs text-muted-foreground block mb-1 truncate">{label}</span>
      <span className="text-lg sm:text-xl font-bold text-foreground break-words">
        {value}
      </span>
    </div>
  );
}

interface MetricSectionProps {
  title: string;
  theme?: MetricTheme;
  children: React.ReactNode;
  className?: string;
}

export function MetricSection({ title, theme = 'default', children, className }: MetricSectionProps) {
  const styles = sectionClasses[theme];
  return (
    <div className={cn('p-4 rounded-2xl overflow-hidden', styles.container, className)}>
      <h5 className={cn('font-medium mb-2', styles.title)}>{title}</h5>
      {children}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: React.ReactNode;
  theme?: MetricTheme;
  valueClassName?: string;
}

export function MetricRow({ label, value, theme = 'default', valueClassName }: MetricRowProps) {
  const styles = sectionClasses[theme];
  return (
    <div className="flex justify-between">
      <span className={cn('text-sm', styles.label)}>{label}</span>
      <span className={cn('font-bold', valueClassName)}>{value}</span>
    </div>
  );
}
