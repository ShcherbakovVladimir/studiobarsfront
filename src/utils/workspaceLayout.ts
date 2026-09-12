export const WORKSPACE_OVERLAY_MQ = '(max-width: 1279px)';
export const WORKSPACE_PHONE_MQ = '(max-width: 767px)';

export function isWorkspaceOverlay(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(WORKSPACE_OVERLAY_MQ).matches;
}

export function isWorkspacePhone(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(WORKSPACE_PHONE_MQ).matches;
}
