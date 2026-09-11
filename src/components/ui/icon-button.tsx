import * as React from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  ghost: 'hover:bg-accent/70 text-foreground/80',
  danger: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500',
  primary: 'hover:bg-primary/10 text-primary',
} as const;

const sizeClasses = {
  sm: 'p-1 rounded-xl',
  md: 'p-1.5 rounded-xl',
} as const;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', label, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center transition-colors disabled:opacity-40 shrink-0',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';
