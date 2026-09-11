import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  default: "btn-gradient shadow-sm",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  outline: "glass-input hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:brightness-110",
  ghost: "hover:bg-accent/70 hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const sizeClasses = {
      default: "h-11 px-5",
      sm: "h-9 px-4 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-11 w-11",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-3xl text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
