import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import userFilesService from '../../services/userFilesService';
import { workspaceFileExtension, type WorkspaceRecognition } from '../../services/workspaceService';
import type { UserFile } from '../../types';

interface WorkspacePdfPagesProps {
  path: string;
  recognition?: WorkspaceRecognition;
}

interface PageShot {
  page: number;
  url: string;
}

function baseName(path: string): string {
  return (path.split('/').pop() ?? path).toLowerCase();
}

function stem(name: string): string {
  const slash = name.split('/').pop() ?? name;
  const dot = slash.lastIndexOf('.');
  return (dot > 0 ? slash.slice(0, dot) : slash).toLowerCase();
}

function fileNames(file: UserFile): string[] {
  const raw = [file.originalName, file.displayName].filter((name): name is string => Boolean(name));
  return raw.flatMap((name) => {
    const lower = name.toLowerCase();
    return [lower, baseName(lower)];
  });
}

function pickUserFile(path: string, ragSource: string | undefined, files: UserFile[]): UserFile | undefined {
  const wanted = baseName(path);
  const named = files.filter((file) => fileNames(file).includes(wanted));
  if (named.length === 1) return named[0];
  const sourceStem = ragSource ? stem(ragSource) : '';
  if (named.length > 1) {
    const bySource = sourceStem ? named.find((file) => file.ragSource && stem(file.ragSource) === sourceStem) : undefined;
    if (bySource) return bySource;
    return [...named].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
  }
  if (sourceStem) {
    const bySource = files.filter((file) => file.ragSource && stem(file.ragSource) === sourceStem);
    if (bySource.length === 1) return bySource[0];
  }
  return undefined;
}

/**
 * PNG страниц PDF лежат в репозитории файлов, не в рабочей папке.
 * GET /api/files/:fileId/pages/:page
 */
export function WorkspacePdfPages({ path, recognition }: WorkspacePdfPagesProps) {
  const [pages, setPages] = useState<PageShot[]>([]);
  const [loading, setLoading] = useState(false);
  const isPdf = workspaceFileExtension(path) === 'pdf';
  const fileId = recognition?.fileId;
  const knownCount = recognition?.pageCount;
  const status = recognition?.status;
  const ragSource = recognition?.ragSource;
  const canLoad = isPdf && (status === 'ready' || Boolean(fileId));

  useEffect(() => {
    if (!canLoad) {
      setPages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    setLoading(true);
    setPages([]);

    void (async () => {
      try {
        let id = fileId;
        let count = knownCount;
        if (!id) {
          const { files } = await userFilesService.list(1, 200);
          const match = pickUserFile(path, ragSource, files);
          id = match?.id;
          count = count ?? match?.pageCount;
        }
        if (!id || cancelled) return;
        if (!count) {
          const detail = await userFilesService.get(id);
          count = detail.pageCount;
        }
        if (!count || cancelled) return;
        for (let page = 1; page <= count; page += 1) {
          const blob = await userFilesService.fetchPageBlob(id, page);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          created.push(url);
          setPages((current) => [...current, { page, url }]);
        }
      } catch {
        /* страниц нет — текст документа остаётся */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [canLoad, path, fileId, knownCount, ragSource]);

  if (!canLoad || (!loading && pages.length === 0)) return null;

  return (
    <section className="workspace-file-sheet mb-3 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Страницы PDF</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Снимки страниц, которые сервер сделал из PDF. Отдельные картинки из текста в рабочую папку не сохраняются.
      </p>
      {loading && pages.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Загружаю страницы…
        </p>
      )}
      {pages.map((shot) => (
        <figure key={shot.page} className="space-y-1.5">
          <img
            src={shot.url}
            alt={`Страница ${shot.page}`}
            className="mx-auto h-auto max-w-full rounded-lg shadow-md"
            loading="lazy"
          />
          <figcaption className="text-center text-[11px] text-muted-foreground">Страница {shot.page}</figcaption>
        </figure>
      ))}
    </section>
  );
}
