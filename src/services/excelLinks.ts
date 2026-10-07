export interface ExcelLink {
  fileName: string;
  source?: string;
  tableName?: string;
}

const storageKey = (userId: string) => `rag_excel_links__u_${userId}`;

function isLink(value: unknown): value is ExcelLink {
  if (!value || typeof value !== 'object') return false;
  const row = value as ExcelLink;
  return typeof row.fileName === 'string' && row.fileName.trim().length > 0;
}

export function loadExcelLinks(userId: string | undefined): ExcelLink[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter(isLink) : [];
  } catch {
    return [];
  }
}

/** Запоминает пару «имя файла → source / tableName», которую вернул сервер. Имя таблицы клиент не собирает. */
export function rememberExcelLink(userId: string | undefined, next: ExcelLink): void {
  if (!userId || !next.fileName.trim()) return;
  const links = loadExcelLinks(userId);
  const index = links.findIndex((item) => item.fileName === next.fileName);
  const previous = index >= 0 ? links[index] : undefined;
  const merged: ExcelLink = {
    fileName: next.fileName,
    source: next.source || previous?.source,
    tableName: next.tableName || previous?.tableName,
  };
  const rest = links.filter((item) => item.fileName !== next.fileName);
  localStorage.setItem(storageKey(userId), JSON.stringify([merged, ...rest].slice(0, 50)));
}
