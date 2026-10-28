import * as React from 'react';
import { cn } from '../../lib/utils';

/** Anti-slop: badges are typographic, not pill capsules (except interactive filters). */
const variantClasses = {
  default: 'text-foreground',
  secondary: 'text-muted-foreground',
  destructive: 'text-destructive',
  outline: 'text-foreground',
  warning: 'text-amber-700 dark:text-amber-400',
} as const;

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center text-xs font-medium meta-text',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
