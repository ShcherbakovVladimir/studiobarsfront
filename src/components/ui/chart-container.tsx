import React from 'react';

interface ChartContainerProps {
  height: number;
  children: React.ReactNode;
  className?: string;
}

/** Fixed-size wrapper for Recharts (avoids width/height -1 in flex/hidden layouts). */
export function ChartContainer({ height, children, className = '' }: ChartContainerProps) {
  return (
    <div className={`w-full min-w-0 ${className}`} style={{ height, minHeight: height }}>
      {children}
    </div>
  );
}
