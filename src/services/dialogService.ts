export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface PromptDialogOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password';
}

export interface AlertDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
}

type ConfirmRequest = ConfirmDialogOptions & {
  kind: 'confirm';
  id: number;
  resolve: (value: boolean) => void;
};

type PromptRequest = PromptDialogOptions & {
  kind: 'prompt';
  id: number;
  resolve: (value: string | null) => void;
};

type AlertRequest = AlertDialogOptions & {
  kind: 'alert';
  id: number;
  resolve: () => void;
};

export type DialogRequest = ConfirmRequest | PromptRequest | AlertRequest;

type DialogListener = (request: DialogRequest | null) => void;

let nextId = 1;
const queue: DialogRequest[] = [];
let current: DialogRequest | null = null;
const listeners = new Set<DialogListener>();

function notify(): void {
  listeners.forEach((listener) => listener(current));
}

function dequeue(): void {
  current = queue.shift() ?? null;
  notify();
}

function enqueue(request: DialogRequest): void {
  queue.push(request);
  if (!current) {
    dequeue();
  }
}

export function subscribeDialogs(listener: DialogListener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function resolveDialog(id: number, result: boolean | string | null | void): void {
  if (!current || current.id !== id) return;

  const request = current;
  current = null;

  if (request.kind === 'confirm') {
    request.resolve(Boolean(result));
  } else if (request.kind === 'prompt') {
    request.resolve(typeof result === 'string' ? result : null);
  } else {
    request.resolve();
  }

  dequeue();
}

export function dismissDialog(id: number): void {
  if (!current || current.id !== id) return;

  const request = current;
  current = null;

  if (request.kind === 'confirm') {
    request.resolve(false);
  } else if (request.kind === 'prompt') {
    request.resolve(null);
  } else {
    request.resolve();
  }

  dequeue();
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    enqueue({
      kind: 'confirm',
      id: nextId++,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'Подтвердить',
      cancelLabel: options.cancelLabel ?? 'Отмена',
      destructive: options.destructive ?? false,
      resolve,
    });
  });
}

export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    enqueue({
      kind: 'prompt',
      id: nextId++,
      title: options.title,
      description: options.description,
      defaultValue: options.defaultValue ?? '',
      placeholder: options.placeholder,
      confirmLabel: options.confirmLabel ?? 'Сохранить',
      cancelLabel: options.cancelLabel ?? 'Отмена',
      inputType: options.inputType ?? 'text',
      resolve,
    });
  });
}

export function alertDialog(options: AlertDialogOptions): Promise<void> {
  return new Promise((resolve) => {
    enqueue({
      kind: 'alert',
      id: nextId++,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'OK',
      resolve,
    });
  });
}
