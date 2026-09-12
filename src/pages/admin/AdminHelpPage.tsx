import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import docsService from '../../services/docsService';
import MarkdownContent from '../../components/MarkdownContent';
import type { HelpDocArticle, HelpDocsCatalog } from '../../types';
import { ApiError } from '../../services/apiClient';
import { DEFAULT_HELP_SLUG, helpPath } from '../../utils/docsLinks';
import { AdminError, AdminLoading, adminBtnGhost } from './adminUi';
import { getErrorMessage } from './adminUtils';
import { cn } from '../../lib/utils';
import { celestia } from '../../lib/celestia';

function scrollToHelpHash(hash: string, root: HTMLElement | null) {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!id) return;
  const decoded = decodeURIComponent(id);
  window.setTimeout(() => {
    const target = (root ?? document).querySelector(`#${CSS.escape(decoded)}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

const HELP_BASE = '/admin/help';

const AdminHelpPage: React.FC = () => {
  const { slug: rawSlug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const slug = rawSlug ? decodeURIComponent(rawSlug) : DEFAULT_HELP_SLUG;
  const articleRef = useRef<HTMLElement>(null);
  const [catalog, setCatalog] = useState<HelpDocsCatalog | null>(null);
  const [article, setArticle] = useState<HelpDocArticle | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [articleLoading, setArticleLoading] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCatalog(await docsService.list());
    } catch (error) {
      setCatalogError(getErrorMessage(error));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!rawSlug) {
      navigate(helpPath(DEFAULT_HELP_SLUG, '', HELP_BASE), { replace: true });
    }
  }, [rawSlug, navigate, HELP_BASE]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setArticleLoading(true);
      setArticleError(null);
      try {
        const doc = await docsService.get(slug);
        if (!cancelled) setArticle(doc);
      } catch (error) {
        if (cancelled) return;
        setArticle(null);
        if (error instanceof ApiError && (error.code === 'DOC_NOT_FOUND' || error.status === 404)) {
          setArticleError('Статья не найдена или недоступна.');
        } else {
          setArticleError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setArticleLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (articleLoading || !article) return;
    scrollToHelpHash(window.location.hash, articleRef.current);
  }, [article, articleLoading, slug]);

  const goToDoc = useCallback(
    (nextSlug: string, hash = '') => {
      setTocOpen(false);
      navigate(helpPath(nextSlug, hash, HELP_BASE));
      if (nextSlug === slug && hash) {
        scrollToHelpHash(hash, articleRef.current);
      }
    },
    [navigate, slug, HELP_BASE]
  );

  const activeSectionId = useMemo(() => {
    if (!catalog) return article?.section;
    for (const section of catalog.sections) {
      if (section.docs.some((doc) => doc.slug === slug)) return section.id;
    }
    return article?.section;
  }, [article?.section, catalog, slug]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <header className={cn(celestia.appHeader, 'flex items-center')}>
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold text-foreground">Справка</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">
              {article?.title || 'База знаний'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className={cn(adminBtnGhost, 'lg:hidden')}
              onClick={() => setTocOpen((open) => !open)}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {tocOpen ? 'Скрыть оглавление' : 'Оглавление'}
            </button>
            <button type="button" onClick={() => void loadCatalog()} className={adminBtnGhost}>
              <RefreshCw className={`w-3.5 h-3.5 ${catalogLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            'w-full shrink-0 border-border overflow-y-auto p-3 space-y-4',
            'lg:w-64 lg:border-r',
            tocOpen ? 'block' : 'hidden lg:block'
          )}
        >
          {catalogError && <AdminError message={catalogError} />}
          {catalogLoading && !catalog && <AdminLoading message="Загрузка оглавления…" />}
          {catalog?.sections.map((section) => (
            <div key={section.id}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.docs.map((doc) => {
                  const active = doc.slug === slug;
                  return (
                    <NavLink
                      key={doc.slug}
                      to={helpPath(doc.slug, '', HELP_BASE)}
                      title={doc.summary || doc.title}
                      onClick={() => setTocOpen(false)}
                      className={cn(
                        'block rounded-xl px-2.5 py-1.5 text-[13px] no-underline transition-colors',
                        active
                          ? 'bg-primary/10 text-foreground border border-primary/20'
                          : 'text-foreground/80 hover:bg-accent/70 border border-transparent',
                        section.id === activeSectionId && !active && 'opacity-90'
                      )}
                    >
                      <span className="block truncate">{doc.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <article
          ref={articleRef}
          className={cn('min-w-0 flex-1 overflow-y-auto p-4 sm:p-6', tocOpen && 'hidden lg:block')}
        >
          {articleError && (
            <AdminError
              message={articleError}
              className="mb-3"
            />
          )}
          {articleLoading && !article && <AdminLoading message="Загрузка статьи…" />}
          {article && (
            <div className="max-w-3xl">
              {article.sectionLabel && (
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  {article.sectionLabel}
                </p>
              )}
              <MarkdownContent
                content={article.markdownLinked}
                isDarkMode={isDarkMode}
                docsLinkBase={HELP_BASE}
                onDocsNavigate={goToDoc}
                className="prose-help"
              />
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default AdminHelpPage;
