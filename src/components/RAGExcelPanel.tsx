import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileSpreadsheet, Table2 } from 'lucide-react';
import ragService, { type SqlTableSnapshot } from '../services/ragService';
import { loadExcelLinks, type ExcelLink } from '../services/excelLinks';
import { subscribeRagLibraryChanged } from '../services/ragLibrarySync';
import { useWorkspacePanel } from '../hooks/useWorkspacePanel';
import { PANEL_IDS } from '../store/workspaceUiSlice';
import type { RagDocument } from '../types';
import { InlineError } from './ui/alert-banner';
import { EmptyState, LoadingState } from './ui/page-states';
import RagPreviewDialog from './RagPreviewDialog';

interface RAGExcelPanelProps {
  userId?: string;
  active?: boolean;
  selectedSources: string[];
  onToggleSource: (source: string) => void;
  selectedTables: string[];
  onToggleTable: (tableName: string) => void;
}

interface ExcelEntry {
  key: string;
  fileName?: string;
  source?: string;
  tableName?: string;
  chunks?: number;
  rowCount?: number;
  ready: boolean;
}

function isExcelSource(source: string): boolean {
  return /\.xlsx?$/i.test(source);
}

function isOwnUploadTable(name: string): boolean {
  return /^upload_[0-9a-f]{8}_/i.test(name);
}

function tableFileHint(table: { name: string }): string | undefined {
  const row = table as { name: string; source?: unknown; filename?: unknown; fileName?: unknown; originalName?: unknown; original_source?: unknown };
  for (const value of [row.source, row.filename, row.fileName, row.originalName, row.original_source]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function buildEntries(
  documents: RagDocument[],
  tables: Array<{ name: string; rowCount?: number; source?: string }>,
  links: ExcelLink[],
): ExcelEntry[] {
  const byKey = new Map<string, ExcelEntry>();
  const put = (entry: ExcelEntry) => {
    const current = byKey.get(entry.key);
    if (!current) {
      byKey.set(entry.key, entry);
      return;
    }
    byKey.set(entry.key, {
      ...current,
      ...entry,
      fileName: entry.fileName || current.fileName,
      source: entry.source || current.source,
      tableName: entry.tableName || current.tableName,
      chunks: entry.chunks ?? current.chunks,
      rowCount: entry.rowCount ?? current.rowCount,
      ready: current.ready && entry.ready,
    });
  };

  for (const link of links) {
    put({
      key: link.tableName || link.source || link.fileName,
      fileName: link.fileName,
      source: link.source,
      tableName: link.tableName,
      ready: true,
    });
  }

  for (const doc of documents) {
    if (!isExcelSource(doc.source)) continue;
    const link = links.find((item) => item.source === doc.source || item.fileName === doc.source);
    const ready = !doc.indexing_in_progress && (
      doc.embedding_status === 'complete'
      || doc.is_fully_indexed === true
      || (doc.completion_percentage ?? 0) >= 100
    );
    put({
      key: link?.tableName || doc.source,
      fileName: link?.fileName || doc.source,
      source: doc.source,
      tableName: link?.tableName,
      chunks: doc.chunks,
      ready,
    });
  }

  for (const table of tables) {
    if (!isOwnUploadTable(table.name)) continue;
    const hinted = table.source;
    const link = links.find((item) => item.tableName === table.name)
      ?? (hinted ? links.find((item) => item.fileName === hinted || item.source === hinted) : undefined);
    put({
      key: table.name,
      fileName: link?.fileName || hinted,
      source: link?.source,
      tableName: table.name,
      rowCount: table.rowCount,
      ready: true,
    });
  }

  return [...byKey.values()];
}

const RAGExcelPanel: React.FC<RAGExcelPanelProps> = ({
  userId,
  active = true,
  selectedSources,
  onToggleSource,
  selectedTables,
  onToggleTable,
}) => {
  const { getToggle, setToggle } = useWorkspacePanel(PANEL_IDS.RAG_CHAT, 'chat');
  const open = getToggle('ragExcelOpen', true);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [tables, setTables] = useState<Array<{ name: string; rowCount?: number; source?: string }>>([]);
  const [links, setLinks] = useState<ExcelLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<ExcelEntry | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [tableSnapshot, setTableSnapshot] = useState<SqlTableSnapshot | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, listed] = await Promise.all([
        ragService.getDocuments(),
        ragService.getTables(),
      ]);
      setDocuments(docs.documents);
      setTables(listed.tables.map((table) => ({
        name: table.name,
        rowCount: table.rowCount,
        source: tableFileHint(table),
      })));
      setLinks(loadExcelLinks(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить Excel');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => subscribeRagLibraryChanged(() => {
    void load();
  }), [load]);

  const entries = useMemo(
    () => buildEntries(documents, tables, links),
    [documents, tables, links],
  );

  const openCompare = async (entry: ExcelEntry) => {
    setOpened(entry);
    setFileText(null);
    setTableSnapshot(null);
    setCompareError(null);
    setCompareLoading(true);
    try {
      const [text, snapshot] = await Promise.all([
        entry.source ? ragService.fetchDocumentText(entry.source) : Promise.resolve(null),
        entry.tableName ? ragService.previewSqlTable(entry.tableName) : Promise.resolve(null),
      ]);
      setFileText(text);
      setTableSnapshot(snapshot);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Не удалось открыть сравнение');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <section className="mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => setToggle('ragExcelOpen', !open)}
          aria-expanded={open}
          className="flex items-center gap-2 min-w-0 flex-1 text-left text-sm font-medium rounded-lg px-1 py-1 -mx-1 hover:bg-accent/70"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">Excel ({entries.length})</span>
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs px-2 py-1 rounded hover:bg-accent/70"
        >
          Обновить
        </button>
      </div>

      {open && (
        <>
          {error && <InlineError message={error} className="mb-2 text-xs" />}
          <p className="text-[11px] text-muted-foreground mb-2">
            Книга из «В поиск» и SQL-таблица из «Как таблицу». Сравнение открывает обе копии, если они есть.
          </p>
          {loading && entries.length === 0 && <LoadingState message="Загрузка Excel..." className="py-4" />}
          {!loading && entries.length === 0 && (
            <EmptyState
              message="Загруженных Excel пока нет. Они появятся здесь после «В поиск» или «Как таблицу»."
              className="py-4 text-sm"
            />
          )}
          <div className="space-y-2">
            {entries.map((entry) => {
              const title = entry.fileName || entry.source || entry.tableName || 'Excel';
              const sourceSelected = Boolean(entry.source && selectedSources.includes(entry.source));
              const tableSelected = Boolean(entry.tableName && selectedTables.includes(entry.tableName));
              return (
                <div key={entry.key} className="rounded-lg border border-border/70 p-2.5">
                  <div className="text-sm font-medium break-words" title={title}>{title}</div>
                  <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {entry.source && (
                      <div className="break-all">Поиск: {entry.source}{entry.chunks != null ? ` · ${entry.chunks} чанков` : ''}</div>
                    )}
                    {entry.tableName && (
                      <div className="break-all font-mono">Таблица: {entry.tableName}{entry.rowCount != null ? ` · ${entry.rowCount} строк` : ''}</div>
                    )}
                    {!entry.source && <div>В поиске этой книги нет</div>}
                    {!entry.tableName && <div>SQL-таблицы по этому файлу нет</div>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void openCompare(entry)}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs hover:bg-accent/70"
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      Сравнить
                    </button>
                    {entry.source && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!entry.ready) {
                            setError(`«${entry.source}» ещё индексируется. Поиск по нему пока недоступен.`);
                            return;
                          }
                          onToggleSource(entry.source!);
                        }}
                        className="rounded-lg px-2 py-1 text-xs hover:bg-accent/70"
                      >
                        {sourceSelected ? 'Убрать из поиска' : 'В поиск'}
                      </button>
                    )}
                    {entry.tableName && (
                      <button
                        type="button"
                        onClick={() => onToggleTable(entry.tableName!)}
                        className="rounded-lg px-2 py-1 text-xs hover:bg-accent/70"
                      >
                        {tableSelected ? 'Убрать таблицу' : 'В SQL-вопрос'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <RagPreviewDialog
        open={Boolean(opened)}
        title={opened?.fileName || opened?.tableName || 'Excel'}
        description="Слева текст книги из поиска, справа строки таблицы в базе."
        onClose={() => {
          setOpened(null);
          setFileText(null);
          setTableSnapshot(null);
          setCompareError(null);
        }}
      >
        {compareLoading && <LoadingState message="Читаю файл и таблицу..." />}
        {compareError && <InlineError message={compareError} className="mb-3" />}
        {!compareLoading && (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-border/70">
              <h3 className="border-b border-border/60 px-3 py-2 text-sm font-medium">Файл</h3>
              <div className="max-h-[65vh] overflow-auto p-3">
                {fileText ? (
                  <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">{fileText}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {opened?.source
                      ? 'Текст книги в индексе пуст.'
                      : 'Эта книга не загружена в поиск. Режим «В поиск» кладёт текст листов сюда, исходный .xlsx здесь не хранится.'}
                  </p>
                )}
              </div>
            </section>
            <section className="min-w-0 rounded-2xl border border-border/70">
              <h3 className="border-b border-border/60 px-3 py-2 text-sm font-medium">
                Таблица{tableSnapshot?.name ? ` ${tableSnapshot.name}` : ''}
              </h3>
              <div className="max-h-[65vh] overflow-auto p-3">
                {tableSnapshot && tableSnapshot.columns.length > 0 ? (
                  <>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      {tableSnapshot.total} строк
                      {tableSnapshot.total > tableSnapshot.rows.length ? `, показаны первые ${tableSnapshot.rows.length}` : ''}
                    </p>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {tableSnapshot.columns.map((column) => (
                            <th key={column} className="sticky top-0 bg-background border-b border-border px-2 py-1 text-left font-medium whitespace-nowrap">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableSnapshot.rows.map((row, index) => (
                          <tr key={index} className="odd:bg-muted/40">
                            {tableSnapshot.columns.map((column, cell) => (
                              <td key={column} className="border-b border-border/50 px-2 py-1 align-top break-words">
                                {row[cell] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {opened?.tableName
                      ? 'В таблице нет строк.'
                      : 'SQL-таблицы нет. Загрузите этот же файл режимом «Как таблицу», чтобы сравнить строки с текстом слева.'}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </RagPreviewDialog>
    </section>
  );
};

export default RAGExcelPanel;
