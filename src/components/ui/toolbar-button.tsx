import * as React from 'react';
import { cn } from '../../lib/utils';

const variantClasses = {
  primary: 'btn-gradient',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  danger: 'bg-destructive hover:brightness-110 text-white',
  warning: 'bg-amber-600 hover:bg-amber-500 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  purple: 'btn-gradient',
  indigo: 'bg-[#0f766e] hover:bg-[#115e59] text-white',
  orange: 'bg-orange-600 hover:bg-orange-500 text-white',
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
        'inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-center shadow-sm',
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
