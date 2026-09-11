import * as React from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  primary: 'btn-gradient',
  success: 'bg-emerald-600/90 hover:bg-emerald-600 text-white backdrop-blur-sm',
  danger: 'bg-red-600/90 hover:bg-red-600 text-white backdrop-blur-sm',
  warning: 'bg-amber-600/90 hover:bg-amber-600 text-white backdrop-blur-sm',
  emerald: 'bg-emerald-600/90 hover:bg-emerald-600 text-white backdrop-blur-sm',
  purple: 'bg-violet-600/85 hover:bg-violet-600 text-white backdrop-blur-sm',
  indigo: 'bg-indigo-600/85 hover:bg-indigo-600 text-white backdrop-blur-sm',
  orange: 'bg-orange-600/85 hover:bg-orange-600 text-white backdrop-blur-sm',
  neutral: 'glass-input hover:bg-accent text-foreground',
} as const;

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ variant = 'primary', className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-3xl text-sm font-medium transition-all disabled:opacity-50 text-center shadow-sm',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
ToolbarButton.displayName = 'ToolbarButton';
