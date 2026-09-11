// /home/user/projects/studioxlam/src/components/ui/progress.tsx
import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        className={cn(
          // Дорожка нейтральная в обеих темах: --secondary здесь давала тёмный фон в светлой.
          "relative h-4 w-full overflow-hidden rounded-full bg-border dark:bg-muted",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
