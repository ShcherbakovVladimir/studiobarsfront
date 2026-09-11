export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;

let nextId = 1;
const listeners = new Set<ToastListener>();

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(text: string, type: ToastType = 'info'): void {
  const toast: ToastMessage = { id: nextId++, text, type };
  listeners.forEach((listener) => listener(toast));
}

export function showSuccessToast(text: string): void {
  showToast(text, 'success');
}

export function showErrorToast(text: string): void {
  showToast(text, 'error');
}

export function showInfoToast(text: string): void {
  showToast(text, 'info');
}

export function showForbiddenToast(message?: string): void {
  showToast(message ?? 'Доступ запрещён', 'error');
}
