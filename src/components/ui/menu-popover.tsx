import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface MenuPopoverProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  matchTriggerWidth?: boolean;
  zIndex?: number;
}

export function MenuPopover({
  open,
  onClose,
  triggerRef,
  children,
  className,
  minWidth = 176,
  matchTriggerWidth = true,
  zIndex = 80,
}: MenuPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelHeight + 8 && rect.top > spaceBelow;
    const width = Math.max(matchTriggerWidth ? rect.width : 0, minWidth);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const left = Math.min(Math.max(8, rect.left), maxLeft);

    setStyle({
      position: 'fixed',
      left,
      width,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex,
    });
  }, [matchTriggerWidth, minWidth, triggerRef, zIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, onClose, triggerRef, updatePosition]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className={cn(
        'glass-panel rounded-2xl border border-border/70 shadow-xl p-1 overflow-hidden',
        className
      )}
      role="presentation"
    >
      {children}
    </div>,
    document.body
  );
}

export const fieldControlClass =
  'inline-flex items-center gap-2 h-8 min-w-0 px-3 rounded-xl text-xs glass-input text-left';

export const fieldInputClass = 'h-8 min-w-0 w-full px-3 rounded-xl text-xs glass-input';

export const fieldTextareaClass =
  'w-full min-w-0 text-sm glass-input rounded-2xl px-3.5 py-2.5 resize-y scroll-clip';
