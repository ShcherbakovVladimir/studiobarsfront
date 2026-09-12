export const DEFAULT_HELP_SLUG = 'index';

export interface DocsLinkTarget {
  slug: string;
  hash: string;
}

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Internal handbook links from markdownLinked: /api/docs/{slug}[#anchor]. */
export function parseDocsApiHref(href: string | undefined): DocsLinkTarget | null {
  if (!href || href.startsWith('mailto:') || href.startsWith('javascript:')) return null;
  const trimmed = href.trim();
  if (trimmed.startsWith('#')) return null;

  try {
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed, window.location.origin);
    const match = url.pathname.match(/\/api\/docs\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    return {
      slug: decodeSlug(match[1]),
      hash: url.hash || '',
    };
  } catch {
    const fallback = trimmed.match(/(?:^|\/)api\/docs\/([^/#?]+)/);
    if (!fallback?.[1]) return null;
    const hashIndex = trimmed.indexOf('#');
    return {
      slug: decodeSlug(fallback[1]),
      hash: hashIndex >= 0 ? trimmed.slice(hashIndex) : '',
    };
  }
}

export function helpBasePath(pathname = typeof window === 'undefined' ? '' : window.location.pathname): string {
  return pathname.startsWith('/help') ? '/help' : '/admin/help';
}

export function helpPath(slug: string, hash = '', base = helpBasePath()): string {
  const path = `${base}/${encodeURIComponent(slug || DEFAULT_HELP_SLUG)}`;
  return hash ? `${path}${hash.startsWith('#') ? hash : `#${hash}`}` : path;
}

export function headingAnchorId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
