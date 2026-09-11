import React from 'react';
import { FolderOpen, Upload } from 'lucide-react';
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
  open = true,
  className = '',
}) => {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'flex flex-col h-full bg-background/40 shrink-0 overflow-hidden',
        'fixed inset-y-0 right-0 z-50 md:relative md:z-auto',
        'transition-[width,transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        open
          ? 'w-80 max-w-[85vw] translate-x-0 border-l border-border shadow-xl md:shadow-none'
          : 'w-80 max-w-[85vw] translate-x-full pointer-events-none border-l border-transparent md:w-0 md:min-w-0 md:max-w-0 md:translate-x-0 md:border-0',
        className
      )}
    >
      <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="text-sm font-semibold truncate">Файлы RAG</h2>
        </div>
        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
            title="Загрузить файл"
          >
            <Upload className="w-4 h-4" />
          </button>
        )}
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
