import { buildFilesApiUrl, filesApi, fetchFilesApi, getToken } from './apiClient';
import type { UserFile, UserFileStatus } from '../types';

export const USER_FILES_MAX_MB = 80;
export const USER_FILES_MAX_BYTES = USER_FILES_MAX_MB * 1024 * 1024;

const ACTIVE_STATUSES = new Set<UserFileStatus>([
  'queued',
  'rendering',
  'ocr',
  'correcting',
  'indexing',
]);

export class FileExistsError extends Error {
  code = 'FILE_EXISTS' as const;
  existing: { id: string; originalName: string };

  constructor(existing: { id: string; originalName: string }) {
    super(`Файл «${existing.originalName}» уже есть в репозитории`);
    this.name = 'FileExistsError';
    this.existing = existing;
  }
}

export class FileUploadCancelledError extends Error {
  constructor() {
    super('UPLOAD_CANCELLED');
    this.name = 'FileUploadCancelledError';
  }
}

export function userFileDisplayName(file: Pick<UserFile, 'originalName' | 'displayName'>): string {
  return (file.displayName || file.originalName || 'document.pdf').trim();
}

export function ragSourceFromFileName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() || name;
  const stem = base.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}.md`;
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isUserFileActive(status: string | undefined): boolean {
  return ACTIVE_STATUSES.has((status || '') as UserFileStatus);
}

export function userFileStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'queued':
      return 'В очереди';
    case 'rendering':
      return 'Страницы → изображения';
    case 'ocr':
      return 'OCR';
    case 'correcting':
      return 'Разметка Markdown';
    case 'indexing':
      return 'Индексация RAG';
    case 'ready':
      return 'Готов';
    case 'error':
      return 'Ошибка';
    default:
      return status || '—';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function normalizeUserFile(raw: unknown): UserFile {
  const row = asRecord(raw);
  const nested = asRecord(row.file);
  const source = Object.keys(nested).length > 0 ? { ...row, ...nested } : row;
  const id = String(source.id ?? source.fileId ?? source.file_id ?? '');
  const originalName = String(
    source.originalName ?? source.original_name ?? source.filename ?? source.name ?? 'document.pdf'
  );
  const displayRaw = source.displayName ?? source.display_name;
  const displayName = typeof displayRaw === 'string' && displayRaw.trim() ? displayRaw.trim() : originalName;
  const progressRaw = source.progress;
  const progress =
    typeof progressRaw === 'number'
      ? progressRaw
      : Number.parseFloat(String(progressRaw ?? '0')) || 0;
  const ragSourceRaw = source.ragSource ?? source.rag_source;
  const ragSource =
    typeof ragSourceRaw === 'string' && ragSourceRaw.trim()
      ? ragSourceRaw.toLowerCase().endsWith('.pdf')
        ? ragSourceFromFileName(ragSourceRaw)
        : ragSourceRaw.trim()
      : String(source.status) === 'ready'
        ? ragSourceFromFileName(displayName)
        : undefined;
  const pageCount = source.pageCount ?? source.page_count ?? source.pages;
  const size = source.size ?? source.bytes ?? source.filesize;

  return {
    id,
    originalName,
    displayName,
    status: (String(source.status ?? 'queued') as UserFileStatus),
    progress: Math.max(0, Math.min(100, progress)),
    statusMessage:
      typeof source.statusMessage === 'string'
        ? source.statusMessage
        : typeof source.message === 'string'
          ? source.message
          : undefined,
    error: typeof source.error === 'string' ? source.error : undefined,
    ragSource,
    replaced: source.replaced === true,
    pageCount: typeof pageCount === 'number' ? pageCount : Number(pageCount) || undefined,
    size: typeof size === 'number' ? size : Number(size) || undefined,
    createdAt:
      typeof source.createdAt === 'string'
        ? source.createdAt
        : typeof source.created_at === 'string'
          ? source.created_at
          : undefined,
    updatedAt:
      typeof source.updatedAt === 'string'
        ? source.updatedAt
        : typeof source.updated_at === 'string'
          ? source.updated_at
          : undefined,
  };
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function parseExistingFile(data: Record<string, unknown>): { id: string; originalName: string } {
  const existingRaw = asRecord(data.existing ?? data.file ?? data);
  const originalName = String(
    existingRaw.displayName ??
      existingRaw.display_name ??
      existingRaw.originalName ??
      existingRaw.original_name ??
      existingRaw.name ??
      'document.pdf'
  );
  return {
    id: String(existingRaw.id ?? existingRaw.fileId ?? existingRaw.file_id ?? ''),
    originalName,
  };
}

function uploadErrorFromBody(status: number, data: Record<string, unknown>): Error {
  const code = typeof data.code === 'string' ? data.code : '';
  if (
    status === 409 &&
    (code === 'FILE_EXISTS' || code === 'file_exists' || data.existing != null)
  ) {
    return new FileExistsError(parseExistingFile(data));
  }
  if (code === 'PDF_REQUIRED') return new Error('Нужен файл PDF');
  if (code === 'NO_FILE') return new Error('Выберите файл');
  const message =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.message === 'string' && data.message) ||
    `Загрузка PDF не удалась: HTTP ${status}`;
  return new Error(message);
}

function uploadPdfWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  options: { replace?: boolean } = {}
): Promise<UserFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    if (options.replace) {
      formData.append('replace', 'true');
      formData.append('ifExists', 'replace');
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
        if (xhr.status === 202 || (xhr.status >= 200 && xhr.status < 300)) {
          const uploaded = normalizeUserFile(data.file ?? data);
          uploaded.replaced = data.replaced === true || uploaded.replaced;
          resolve(uploaded);
          return;
        }
        reject(uploadErrorFromBody(xhr.status, data));
      } catch {
        reject(new Error(`Загрузка PDF не удалась: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Сеть: не удалось загрузить PDF')));
    xhr.addEventListener('abort', () => reject(new Error('Загрузка PDF отменена')));
    const path = options.replace ? '/upload/pdf?replace=true' : '/upload/pdf';
    xhr.open('POST', buildFilesApiUrl(path));
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

function extractUserFileRows(data: unknown): { files: UserFile[]; total: number } {
  const row = asRecord(data);
  const nested = asRecord(row.data);
  const candidates = [row.files, row.items, nested.files, nested.items, Array.isArray(row.data) ? row.data : null];
  const rows = (candidates.find((item) => Array.isArray(item)) as unknown[] | undefined) ?? [];
  const seen = new Set<string>();
  const files = rows
    .map(normalizeUserFile)
    .filter((file) => {
      if (!file.id || file.id === 'undefined' || seen.has(file.id)) return false;
      seen.add(file.id);
      return true;
    });
  const totalRaw = row.total ?? nested.total ?? row.count ?? nested.count;
  return {
    files,
    total: typeof totalRaw === 'number' ? totalRaw : Number(totalRaw) || files.length,
  };
}

export const userFilesService = {
  async list(page = 1, limit = 50): Promise<{ files: UserFile[]; total: number }> {
    const data = await filesApi<unknown>(`?page=${page}&limit=${limit}`);
    return extractUserFileRows(data);
  },

  async get(fileId: string): Promise<UserFile> {
    const data = await filesApi<Record<string, unknown>>(`/${encodeURIComponent(fileId)}`);
    return normalizeUserFile(data.file ?? data);
  },

  async uploadPdf(
    file: File,
    onProgress?: (percent: number) => void,
    options: { replace?: boolean } = {}
  ): Promise<UserFile> {
    if (!isPdfFile(file)) {
      throw new Error('Нужен файл PDF');
    }
    if (file.size > USER_FILES_MAX_BYTES) {
      throw new Error(`PDF больше ${USER_FILES_MAX_MB} МБ`);
    }
    return uploadPdfWithProgress(file, onProgress, options);
  },

  async poll(
    fileId: string,
    onUpdate?: (file: UserFile) => void,
    intervalMs = 2500
  ): Promise<UserFile> {
    let current = await this.get(fileId);
    onUpdate?.(current);
    while (isUserFileActive(current.status)) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
      current = await this.get(fileId);
      onUpdate?.(current);
    }
    return current;
  },

  async retry(fileId: string): Promise<UserFile> {
    const data = await filesApi<Record<string, unknown>>(`/${encodeURIComponent(fileId)}/retry`, {
      method: 'POST',
    });
    return normalizeUserFile(data.file ?? data);
  },

  async remove(fileId: string): Promise<void> {
    await filesApi(`/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  },

  async getMarkdown(fileId: string): Promise<string> {
    const response = await fetchFilesApi(`/${encodeURIComponent(fileId)}/markdown`, {}, 60_000);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Не удалось получить Markdown: HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { markdown?: string; content?: string; text?: string };
      return data.markdown ?? data.content ?? data.text ?? '';
    }
    return response.text();
  },

  async fetchOriginalBlob(fileId: string): Promise<Blob> {
    const response = await fetchFilesApi(`/${encodeURIComponent(fileId)}/download`, {}, 120_000);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Не удалось открыть PDF: HTTP ${response.status}`);
    }
    return response.blob();
  },

  async downloadOriginal(fileId: string, filename = 'document.pdf'): Promise<void> {
    const blob = await this.fetchOriginalBlob(fileId);
    triggerDownload(blob, filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`);
  },
};

export default userFilesService;
