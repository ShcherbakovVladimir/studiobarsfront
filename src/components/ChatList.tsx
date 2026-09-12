import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Plus, Trash2, RefreshCw, Edit2, X } from 'lucide-react';
import type { ChatData } from '../services/chatSyncService';
import { confirmDialog } from '../services/dialogService';
import { IconButton } from './ui/icon-button';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';
import { useDrawerRootRef, useWorkspaceOverlay } from '../utils/workspaceLayout';

interface ChatListProps {
  chats: ChatData[];
  currentChatId?: string;
  isLoading?: boolean;
  isLoaded?: boolean;
  onSelectChat: (chat: ChatData) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onCreateNew: () => void;
  onRefresh?: () => void;
  onClose?: () => void;
  open?: boolean;
  className?: string;
}

function formatChatDate(dateStr: string): string {
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

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentChatId,
  isLoading = false,
  isLoaded = false,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onCreateNew,
  onRefresh,
  onClose,
  open = true,
  className = '',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const drawerRef = useDrawerRootRef(open);
  const overlay = useWorkspaceOverlay();

  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
  );

  const startRename = (chat: ChatData) => {
    setEditingId(chat.id);
    setEditTitle(chat.title || '');
  };

  const saveRename = (chatId: string) => {
    onRenameChat(chatId, editTitle.trim());
    setEditingId(null);
  };

  const handleCreate = () => {
    onCreateNew();
    onClose?.();
  };

  const panel = (
    <aside
      ref={drawerRef}
      aria-hidden={!open}
      inert={!open}
      aria-label="Список чатов"
      className={cn(
        celestia.workspaceDrawer,
        'left-0',
        'max-md:!inset-x-0 max-md:!top-auto max-md:!bottom-0 max-md:!h-[min(72dvh,36rem)] max-md:!max-h-[72dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-[1.75rem] max-md:rounded-b-none max-md:border-x-0 max-md:border-t max-md:pt-0 max-md:bg-card max-md:backdrop-blur-none',
        'md:top-0 md:max-xl:left-64 md:h-full md:rounded-none',
        'md:max-xl:bg-card md:max-xl:backdrop-blur-none',
        'xl:bg-transparent xl:backdrop-blur-none',
        open
          ? cn(
              'translate-x-0 translate-y-0 border-border shadow-[0_-8px_32px_rgba(15,23,42,0.12)]',
              'md:shadow-xl xl:shadow-none xl:w-72 xl:max-w-none xl:border-r xl:border-border'
            )
          : cn(
              'pointer-events-none opacity-0',
              'max-md:translate-y-full max-md:translate-x-0',
              'md:max-xl:-translate-x-full',
              'xl:opacity-100 xl:w-0 xl:min-w-0 xl:max-w-0 xl:translate-x-0 xl:translate-y-0',
              'border-transparent'
            ),
        open && 'w-[min(20rem,calc(100vw-2.5rem))] max-w-[85vw] md:max-xl:w-80 md:max-xl:max-w-[min(20rem,calc(100vw-16rem))]',
        className
      )}
    >
      <div className="xl:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden>
        <span className="h-1 w-11 rounded-full bg-muted-foreground/35" />
      </div>

      <div className={cn(celestia.appHeaderBar, 'justify-between gap-2 max-md:h-11 max-md:border-b-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <MessageSquare className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate leading-tight">Чаты</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {isLoaded ? `${sortedChats.length}` : '…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-busy={isLoading}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground disabled:pointer-events-none disabled:opacity-50"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="hidden xl:inline-flex p-2 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-transform active:scale-95"
            title="Новый чат"
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
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground xl:hidden transition-transform active:scale-95"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pt-2 pb-2 space-y-1">
        {!isLoaded && (
          <div className="text-xs text-muted-foreground text-center py-8">Загрузка чатов…</div>
        )}

        {isLoaded && sortedChats.length === 0 && (
          <div className="flex flex-col items-center text-center py-10 px-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-muted-foreground mb-3">
              <MessageSquare className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-foreground">Пока нет чатов</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[16rem]">
              Новый диалог появится здесь. На узком экране список открывается поверх чата.
            </p>
          </div>
        )}

        {sortedChats.map((chat, index) => {
          const isActive = chat.id === currentChatId;
          const count = chat.messageCount ?? chat.messages?.length ?? 0;
          const isEditing = editingId === chat.id;

          return (
            <div
              key={chat.id}
              className={cn(
                'workspace-list-item group relative rounded-2xl transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.99]',
                isActive
                  ? 'bg-primary/10 shadow-sm'
                  : 'hover:bg-accent/80'
              )}
              style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
            >
              {isEditing ? (
                <div className="p-2.5">
                  <input
                    id={`chat-rename-${chat.id}`}
                    name="chatTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveRename(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(chat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full h-10 px-3 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/40 glass-input"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    className="w-full text-left px-3.5 py-3 pr-20 min-h-14"
                  >
                    <div
                      className={cn(
                        'text-sm truncate',
                        isActive ? 'font-semibold text-foreground' : 'font-medium'
                      )}
                      title={chat.title}
                    >
                      {chat.title || 'Новый чат'}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{formatChatDate(chat.updatedAt ?? chat.createdAt ?? new Date().toISOString())}</span>
                      {count > 0 && <span>· {count}</span>}
                    </div>
                  </button>
                  <div
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center',
                      isActive ? 'opacity-100' : 'opacity-100 xl:opacity-0 xl:group-hover:opacity-100'
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(chat);
                      }}
                      className="p-2 rounded-xl hover:bg-accent text-muted-foreground"
                      title="Переименовать"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <IconButton
                      variant="danger"
                      size="sm"
                      label="Удалить чат"
                      onClick={(e) => {
                        e.stopPropagation();
                        void (async () => {
                          const confirmed = await confirmDialog({
                            title: 'Удалить чат?',
                            description: `Удалить чат «${chat.title || chat.id}»?`,
                            destructive: true,
                            confirmLabel: 'Удалить',
                          });
                          if (confirmed) onDeleteChat(chat.id);
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

      <div className="xl:hidden shrink-0 border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleCreate}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-medium btn-gradient text-white active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </button>
      </div>
    </aside>
  );

  const ui = (
    <>
      {overlay && onClose && (
        <button
          type="button"
          aria-label="Закрыть список чатов"
          onClick={onClose}
          className={cn(
            'fixed inset-0 z-40 xl:hidden transition-opacity duration-300 ease-out motion-reduce:transition-none',
            'bg-black/20 dark:bg-black/35',
            'md:left-64',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        />
      )}
      {panel}
    </>
  );

  if (overlay && typeof document !== 'undefined') {
    return createPortal(ui, document.body);
  }
  return ui;
};

export default ChatList;
