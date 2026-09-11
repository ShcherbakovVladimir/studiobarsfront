import type { JsonObject, UnknownRecord } from '../types';

export type GrammarSource = 'none' | 'template' | 'json_schema' | 'gbnf';

export interface GrammarSelection {
  source: GrammarSource;
  /** Алиас шаблона llama.cpp: json, list, json_arr */
  templateId?: string;
  /** Алиас (json/list) или полный GBNF */
  grammar?: string;
  /** Приоритетнее grammar на сервере */
  jsonSchema?: JsonObject;
  label?: string;
}

export function createEmptyGrammarSelection(): GrammarSelection {
  return { source: 'none' };
}

export function grammarSelectionLabel(selection: GrammarSelection): string {
  if (selection.label) return selection.label;
  if (selection.source === 'template' && selection.templateId) {
    return `шаблон: ${selection.templateId}`;
  }
  if (selection.source === 'json_schema') return 'JSON Schema';
  if (selection.source === 'gbnf') return 'GBNF';
  return '';
}

export function isGrammarActive(selection: GrammarSelection): boolean {
  return (
    selection.source !== 'none' &&
    Boolean(selection.jsonSchema || selection.grammar)
  );
}

/** Поля для API: json_schema имеет приоритет над grammar (как на сервере). */
export function buildGrammarApiFields(options: {
  grammar?: string;
  jsonSchema?: JsonObject | UnknownRecord;
}): { grammar?: string; json_schema?: JsonObject | UnknownRecord } {
  if (options.jsonSchema && Object.keys(options.jsonSchema).length > 0) {
    return { json_schema: options.jsonSchema };
  }
  if (options.grammar?.trim()) {
    return { grammar: options.grammar.trim() };
  }
  return {};
}

export function grammarSelectionToApiFields(
  selection?: GrammarSelection | null
): { grammar?: string; json_schema?: JsonObject | UnknownRecord } {
  if (!selection || selection.source === 'none') return {};
  return buildGrammarApiFields({
    grammar: selection.grammar,
    jsonSchema: selection.jsonSchema,
  });
}

export function normalizeGrammarTemplateList(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === 'string');
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['templates', 'grammars', 'types', 'items']) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }
    }
  }

  return [];
}
