import React from 'react';
import { usePanelScroll } from '../../hooks/useWorkspacePanel';
import { cn } from '../../lib/utils';

interface PanelScrollAreaProps {
  panelId: string;
  tab: string;
  className?: string;
  children: React.ReactNode;
}

export function PanelScrollArea({ panelId, tab, className, children }: PanelScrollAreaProps) {
  const scrollRef = usePanelScroll(panelId, tab);

  return (
    <div
      ref={scrollRef}
      className={cn('min-h-0 overflow-y-auto overflow-x-hidden scroll-clip', className)}
    >
      {children}
    </div>
  );
}
