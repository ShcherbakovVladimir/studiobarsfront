import React from 'react';
import { FolderOpen, Upload, X } from 'lucide-react';
import RAGDocumentsPanel from './RAGDocumentsPanel';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';

interface RAGFilesSidebarProps {
  isDarkMode: boolean;
  selectedSources: string[];
  onSelectionChange: (sources: string[]) => void;
  onDocumentsChange?: () => void;
  onUpload?: () => void;
  highlightSource?: string | null;
  onClose?: () => void;
  open?: boolean;
  className?: string;
}

const RAGFilesSidebar: React.FC<RAGFilesSidebarProps> = ({
  isDarkMode,
  selectedSources,
  onSelectionChange,
  onDocumentsChange,
  onUpload,
  highlightSource,
  onClose,
  open = true,
  className = '',
}) => {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        celestia.workspaceDrawer,
        'right-0',
        open
          ? 'w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-0 border-l border-border shadow-2xl xl:shadow-none xl:w-80'
          : 'w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-full pointer-events-none border-l border-transparent opacity-0 xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0',
        className
      )}
    >
      <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="text-sm font-semibold truncate">Файлы RAG</h2>
        </div>
        <div className="flex items-center gap-1">
          {onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95"
              title="Загрузить файл"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <RAGDocumentsPanel
          isDarkMode={isDarkMode}
          selectedSources={selectedSources}
          onSelectionChange={onSelectionChange}
          onDocumentsChange={onDocumentsChange}
          compact
          pollIndexing
          highlightSource={highlightSource}
        />
      </div>
    </aside>
  );
};

export default RAGFilesSidebar;
