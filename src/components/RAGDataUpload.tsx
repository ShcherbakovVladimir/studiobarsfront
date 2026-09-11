// /home/user/projects/studioxlam/src/components/RAGDataUpload.tsx
import React, { useState, useCallback } from 'react';
import ragService from '../services/ragService';
import { confirmDialog } from '../services/dialogService';
import { InlineError, InlineSuccess } from './ui/alert-banner';

interface RAGDataUploadProps {
  onUploadComplete?: () => void;
  isDarkMode: boolean;
}

interface TableInfo {
  name: string;
  columns: Array<{ name: string; type: string; nullable: boolean }>;
  columnCount: number;
  rowCount: number;
}

const RAGDataUpload: React.FC<RAGDataUploadProps> = ({ onUploadComplete, isDarkMode }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState('');
  const [ifExists, setIfExists] = useState<'replace' | 'append'>('replace');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showTableList, setShowTableList] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const loadTables = useCallback(async () => {
    try {
      const data = await ragService.getTables();
      if (data.success) {
        setTables(data.tables);
      }
    } catch (loadError) {
      console.error('Failed to load tables:', loadError);
    }
  }, []);

  const toggleTableExpand = (name: string) => {
    setExpandedTables((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) newSet.delete(name);
      else newSet.add(name);
      return newSet;
    });
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setTableName('');
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const response = await ragService.uploadTableWithProgress(
        selectedFile,
        { tableName: tableName.trim(), ifExists },
        (progress) => setUploadProgress(progress)
      );

      setSuccess(`✅ ${response.message} (${response.rowCount ?? response.rowsInserted ?? 0} rows)`);
      setSelectedFile(null);
      setTableName('');
      void loadTables();
      onUploadComplete?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTable = async (name: string) => {
    const confirmed = await confirmDialog({
      title: 'Удалить таблицу?',
      description: `Вы уверены, что хотите удалить таблицу "${name}"? Это действие нельзя отменить.`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;

    try {
      const data = await ragService.deleteTable(name, true);
      if (data.success) {
        setSuccess(`✅ Таблица "${name}" удалена`);
        void loadTables();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleClearTable = async (name: string) => {
    const confirmed = await confirmDialog({
      title: 'Очистить таблицу?',
      description: `Вы уверены, что хотите очистить все данные из таблицы "${name}"?`,
      destructive: true,
      confirmLabel: 'Очистить',
    });
    if (!confirmed) return;

    try {
      const data = await ragService.clearTable(name);
      if (data.success) {
        setSuccess(`✅ Таблица "${name}" очищена`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка очистки');
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 border-border glass-panel`}>
        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">📤 Загрузка данных (SQL-таблицы)</h3>

        <div className="space-y-3">
          <div>
            <label htmlFor="rag-upload-table-name" className="block text-sm font-medium mb-1">Название таблицы</label>
            <input
              id="rag-upload-table-name"
              name="tableName"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="например: customers, orders, products"
              className={`w-full px-3 py-2 rounded-lg border border-border glass-input focus:outline-none focus:ring-2 focus:ring-ring/40`}
            />
          </div>

          <div>
            <label htmlFor="rag-upload-file" className="block text-sm font-medium mb-1">Файл (CSV, JSON, Excel)</label>
            <input
              id="rag-upload-file"
              name="file"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".csv,.json,.xlsx,.xls"
              className="w-full"
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rag-upload-if-exists" className="block text-sm font-medium mb-1">Если таблица существует</label>
            <select
              id="rag-upload-if-exists"
              name="ifExists"
              value={ifExists}
              onChange={(e) => setIfExists(e.target.value as 'replace' | 'append')}
              className={`w-full px-3 py-2 rounded-lg border border-border glass-input focus:outline-none focus:ring-2 focus:ring-ring/40`}
            >
              <option value="replace">Заменить (удалить и создать заново)</option>
              <option value="append">Добавить (дополнить существующую)</option>
            </select>
          </div>

          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Загрузка...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-border dark:bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading || !selectedFile || !tableName}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Загрузка...' : 'Загрузить в базу данных'}
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="px-4 py-2 glass-input hover:bg-accent text-foreground rounded-lg font-medium transition-colors"
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-lg border border-border glass-panel`}>
        <button
          type="button"
          onClick={() => {
            setShowTableList(!showTableList);
            if (!showTableList) void loadTables();
          }}
          className="w-full p-4 flex justify-between items-center hover:bg-accent dark:hover:bg-muted/50 transition-colors rounded-lg"
        >
          <span className="font-semibold flex items-center gap-2">
            📋 Таблицы в базе данных
            <span className="text-xs text-muted-foreground">({tables.length})</span>
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${showTableList ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTableList && (
          <div className="border-t p-3 space-y-2 max-h-96 overflow-y-auto">
            {tables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет таблиц. Загрузите данные для создания таблиц.
              </p>
            ) : (
              tables.map((table) => (
                <div
                  key={table.name}
                  className="rounded-lg transition-colors bg-muted/40 dark:bg-muted/50"
                >
                  <div className="flex justify-between items-center p-3">
                    <button
                      type="button"
                      onClick={() => toggleTableExpand(table.name)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedTables.has(table.name) ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <div className="font-mono text-sm font-medium">{table.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {table.columnCount} колонок, {table.rowCount} строк
                        </div>
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleClearTable(table.name)}
                        className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
                      >
                        Очистить
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTable(table.name)}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-700 dark:text-red-400 rounded hover:bg-red-500/30 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  {expandedTables.has(table.name) && (
                    <div className="border-t px-3 py-2 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Колонки:</div>
                      <div className="flex flex-wrap gap-1">
                        {table.columns.map((col, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground dark:text-foreground/80"
                            title={`Тип: ${col.type}, Nullable: ${col.nullable}`}
                          >
                            {col.name}
                            <span className="ml-1 text-muted-foreground text-[10px]">
                              ({col.type.split(' ')[0]})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <InlineError message={`❌ ${error}`} onDismiss={() => setError(null)} />}
      {success && <InlineSuccess message={`✅ ${success}`} onDismiss={() => setSuccess(null)} />}
    </div>
  );
};

export default RAGDataUpload;
