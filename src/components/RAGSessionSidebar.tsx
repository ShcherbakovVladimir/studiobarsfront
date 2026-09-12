import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, RefreshCw, Edit2, X } from 'lucide-react';
import type { RagSession } from '../types';
import { confirmDialog } from '../services/dialogService';
import { IconButton } from './ui/icon-button';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';
import { useDrawerRootRef } from '../utils/workspaceLayout';

interface RAGSessionSidebarProps {
  sessions: RagSession[];
  activeSessionId: string;
  isLoading?: boolean;
  isSessionsLoaded?: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, title: string) => void;
  onRefresh?: () => void;
  onClose?: () => void;
  open?: boolean;
  className?: string;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} д назад`;
  return date.toLocaleDateString('ru-RU');
}

const RAGSessionSidebar: React.FC<RAGSessionSidebarProps> = ({
  sessions,
  activeSessionId,
  isLoading = false,
  isSessionsLoaded = false,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onRefresh,
  onClose,
  open = true,
  className = '',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const drawerRef = useDrawerRootRef(open);

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const startRename = (session: RagSession) => {
    setEditingId(session.sessionId);
    setEditTitle(session.title || '');
  };

  const saveRename = (sessionId: string) => {
    if (onRenameSession) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      ref={drawerRef}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        celestia.workspaceDrawer,
        'left-0',
        open
          ? 'w-[min(18.5rem,calc(100vw-2.5rem))] max-w-[85vw] translate-x-0 border-r border-border shadow-2xl xl:shadow-none xl:w-72'
          : 'w-[min(18.5rem,calc(100vw-2.5rem))] max-w-[85vw] -translate-x-full pointer-events-none border-r border-transparent opacity-0 xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0',
        className
      )}
    >
      <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="text-sm font-semibold truncate">RAG-сессии ({sortedSessions.length})</h2>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-border dark:hover:bg-muted text-muted-foreground"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onNewSession}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95"
            title="Новая сессия"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur();
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!isSessionsLoaded && (
          <div className="text-xs text-muted-foreground text-center py-6">Загрузка сессий...</div>
        )}

        {isSessionsLoaded && sortedSessions.length === 0 && (
          <div className="text-center py-8 px-3">
            <p className="text-sm text-muted-foreground mb-3">Нет сохранённых сессий</p>
            <button
              type="button"
              onClick={onNewSession}
              className="text-sm px-3 py-1.5 rounded-lg btn-gradient text-white"
            >
              Начать новую
            </button>
          </div>
        )}

        {sortedSessions.map((session, index) => {
          const isActive = session.sessionId === activeSessionId;
          const count = session.messageCount ?? session.count ?? 0;
          const isEditing = editingId === session.sessionId;

          return (
            <div
              key={session.sessionId}
              className={`workspace-list-item group relative rounded-lg border transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/40 shadow-sm'
                  : 'border-transparent hover:bg-accent dark:hover:bg-card'
              }`}
              style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-blue-500" aria-hidden />
              )}
              {isEditing ? (
                <div className="p-2">
                  <input
                    id={`rag-session-rename-${session.sessionId}`}
                    name="sessionTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveRename(session.sessionId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(session.sessionId);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40 surface-elevated"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.sessionId)}
                    className="w-full text-left p-3 pr-16"
                  >
                    <div
                      className={`text-sm truncate ${isActive ? 'font-semibold text-blue-700 dark:text-blue-300' : 'font-medium'}`}
                      title={session.title}
                    >
                      {session.title || 'Без названия'}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{formatSessionDate(session.updatedAt)}</span>
                      {count > 0 && <span>· {count} сообщ.</span>}
                    </div>
                  </button>
                  <div
                    className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-100 xl:opacity-0 xl:group-hover:opacity-100'
                    }`}
                  >
                    {onRenameSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session);
                        }}
                        className="p-1.5 rounded-md hover:bg-border dark:hover:bg-muted text-muted-foreground"
                        title="Переименовать"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <IconButton
                      variant="danger"
                      size="sm"
                      label="Удалить сессию"
                      onClick={(e) => {
                        e.stopPropagation();
                        void (async () => {
                          const confirmed = await confirmDialog({
                            title: 'Удалить сессию?',
                            description: `Удалить сессию «${session.title || session.sessionId}»?`,
                            destructive: true,
                            confirmLabel: 'Удалить',
                          });
                          if (confirmed) onDeleteSession(session.sessionId);
                        })();
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default RAGSessionSidebar;
