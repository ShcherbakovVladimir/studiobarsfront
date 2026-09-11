import type { UnknownRecord } from '../types';

export type DocumentationFormat = 'typescript' | 'markdown' | 'jsdoc';

export type ApiDocumentationFormat = 'markdown' | 'typescript' | 'ts' | 'jsdoc' | 'js';

export function toApiDocumentationFormat(format: DocumentationFormat | string): ApiDocumentationFormat {
  switch (format) {
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'jsdoc':
    case 'js':
      return 'jsdoc';
    case 'markdown':
    default:
      return 'markdown';
  }
}

export function fromApiDocumentationFormat(
  format?: string,
  language?: string
): DocumentationFormat {
  switch (format) {
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'jsdoc':
    case 'js':
      return 'jsdoc';
    case 'markdown':
      return 'markdown';
    default:
      if (language === 'javascript') return 'jsdoc';
      return 'markdown';
  }
}

export function normalizeFunctionsPayload(parsed: unknown): UnknownRecord[] {
  if (!Array.isArray(parsed)) {
    throw new Error('Ожидается JSON-массив функций');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Элемент ${index + 1} должен быть объектом`);
    }

    const record = item as UnknownRecord;
    if (record.function && typeof record.function === 'object') {
      return record.function as UnknownRecord;
    }

    if (typeof record.name === 'string') {
      return record;
    }

    throw new Error(`Элемент ${index + 1}: отсутствует name или function`);
  });
}
