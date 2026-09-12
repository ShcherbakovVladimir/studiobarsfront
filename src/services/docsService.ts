import { api, ApiError } from './apiClient';
import type { HelpDocArticle, HelpDocMeta, HelpDocsCatalog, HelpDocsSection } from '../types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeDocMeta(raw: unknown): HelpDocMeta | null {
  const row = asRecord(raw);
  const slug = String(row.slug ?? '').trim();
  if (!slug) return null;
  const roles = Array.isArray(row.roles) ? row.roles.map((item) => String(item)) : undefined;
  return {
    slug,
    title: String(row.title ?? slug),
    section: typeof row.section === 'string' ? row.section : undefined,
    sectionLabel: typeof row.sectionLabel === 'string' ? row.sectionLabel : undefined,
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    roles,
    file: typeof row.file === 'string' ? row.file : undefined,
  };
}

function sectionsFromDocs(docs: HelpDocMeta[]): HelpDocsSection[] {
  const order: string[] = [];
  const map = new Map<string, HelpDocsSection>();
  for (const doc of docs) {
    const id = doc.section || 'other';
    if (!map.has(id)) {
      order.push(id);
      map.set(id, {
        id,
        label: doc.sectionLabel || id,
        docs: [],
      });
    }
    map.get(id)!.docs.push(doc);
  }
  return order.map((id) => map.get(id)!);
}

export const docsService = {
  async list(): Promise<HelpDocsCatalog> {
    const data = await api<Record<string, unknown>>('/docs');
    const docs = (Array.isArray(data.docs) ? data.docs : [])
      .map(normalizeDocMeta)
      .filter((item): item is HelpDocMeta => Boolean(item));
    const rawSections = Array.isArray(data.sections) ? data.sections : [];
    const sections = rawSections
      .map((sectionRaw) => {
        const row = asRecord(sectionRaw);
        const nested = (Array.isArray(row.docs) ? row.docs : [])
          .map(normalizeDocMeta)
          .filter((item): item is HelpDocMeta => Boolean(item));
        const id = String(row.id ?? row.section ?? '').trim();
        if (!id && nested.length === 0) return null;
        return {
          id: id || 'other',
          label: String(row.label ?? row.sectionLabel ?? id ?? 'Прочее'),
          docs: nested,
        } satisfies HelpDocsSection;
      })
      .filter((item): item is HelpDocsSection => Boolean(item));

    return {
      success: data.success !== false,
      role: typeof data.role === 'string' ? data.role : undefined,
      count: typeof data.count === 'number' ? data.count : docs.length,
      docs,
      sections: sections.length > 0 ? sections : sectionsFromDocs(docs),
    };
  },

  async get(slug: string): Promise<HelpDocArticle> {
    const encoded = encodeURIComponent(slug);
    try {
      const data = await api<Record<string, unknown>>(`/docs/${encoded}`);
      const raw = data.doc ?? data;
      const meta = normalizeDocMeta(raw);
      if (!meta) {
        throw new ApiError('Статья не найдена', 404, 'DOC_NOT_FOUND', data);
      }
      const row = asRecord(raw);
      const markdownLinked =
        typeof row.markdownLinked === 'string'
          ? row.markdownLinked
          : typeof row.markdown === 'string'
            ? row.markdown
            : '';
      return {
        ...meta,
        markdown: typeof row.markdown === 'string' ? row.markdown : undefined,
        markdownLinked,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Статья не найдена', 404, error.code ?? 'DOC_NOT_FOUND', error.data);
      }
      throw error;
    }
  },
};

export default docsService;
