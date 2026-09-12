import { useEffect, useRef } from 'react';

export const WORKSPACE_OVERLAY_MQ = '(max-width: 1279px)';
export const WORKSPACE_PHONE_MQ = '(max-width: 767px)';

export function isWorkspaceOverlay(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(WORKSPACE_OVERLAY_MQ).matches;
}

export function isWorkspacePhone(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(WORKSPACE_PHONE_MQ).matches;
}

/** Blur focus inside a closed drawer so aria-hidden/inert is valid. */
export function useDrawerRootRef(open: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const root = ref.current;
    const active = document.activeElement;
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur();
    }
  }, [open]);
  return ref;
}
