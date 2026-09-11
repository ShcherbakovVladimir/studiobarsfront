import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react';
import adminService from '../../services/adminService';
import { ApiError } from '../../services/apiClient';
import type { AdminUser, ChatMessage, ChatSummary, PersistedChat } from '../../types';
import {
  AdminCard,
  AdminError,
  AdminLoading,
  AdminSuccess,
  AdminWorkspace,
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminInput,
  adminTextarea,
} from './adminUi';
import { formatAdminDate, formatAdminTimestamp, getErrorMessage } from './adminUtils';
import { confirmDialog } from '../../services/dialogService';
import { IconButton } from '../../components/ui/icon-button';
import { cn } from '../../lib/utils';

const ROLE_LABELS: Record<string, string> = {
  user: 'Пользователь',
  assistant: 'Ассистент',
  system: 'Система',
  tool: 'Инструмент',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'user':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'assistant':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'system':
      return 'bg-border text-foreground/80 dark:bg-muted dark:text-foreground';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  }
}

async function persistChat(
  userId: string,
  chat: PersistedChat,
  messages: ChatMessage[],
  title: string
): Promise<PersistedChat> {
  const res = await adminService.updateUserChat(userId, chat.id, {
    title,
    messages,
    systemPrompt: chat.systemPrompt,
    modelId: chat.modelId,
    sessionId: chat.sessionId,
    chatWrapper: chat.chatWrapper,
    metadata: chat.metadata,
  });
  return res.chat;
}

async function saveMessageContent(
  userId: string,
  chat: PersistedChat,
  messageIndex: number,
  content: string
): Promise<PersistedChat> {
  try {
    const res = await adminService.updateUserChatMessage(userId, chat.id, messageIndex, {
      content,
    });
    return res.chat;
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) {
      throw err;
    }
    const messages = chat.messages.map((msg, idx) =>
      idx === messageIndex ? { ...msg, content } : msg
    );
    return persistChat(userId, chat, messages, chat.title ?? '');
  }
}

async function removeMessage(
  userId: string,
  chat: PersistedChat,
  messageIndex: number
): Promise<PersistedChat> {
  try {
    const res = await adminService.deleteUserChatMessage(userId, chat.id, messageIndex);
    return res.chat;
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) {
      throw err;
    }
    const messages = chat.messages.filter((_, idx) => idx !== messageIndex);
    return persistChat(userId, chat, messages, chat.title ?? '');
  }
}

const AdminUserChatsPage: React.FC = () => {
  const { userId = '', chatId } = useParams<{ userId: string; chatId?: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chat, setChat] = useState<PersistedChat | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUserAndChats = useCallback(async () => {
    if (!userId) return;
    setListLoading(true);
    setError(null);
    try {
      const [userRes, chatsRes] = await Promise.all([
        adminService.getUser(userId),
        adminService.getUserChats(userId, { summary: true }),
      ]);
      setUser(userRes.user);
      setChats(chatsRes.chats);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, [userId]);

  const loadChat = useCallback(
    async (id: string) => {
      if (!userId) return;
      setChatLoading(true);
      setError(null);
      setNotice(null);
      setEditingIndex(null);
      try {
        const res = await adminService.getUserChat(userId, id);
        setChat(res.chat);
        setEditTitle(res.chat.title ?? '');
      } catch (err) {
        setError(getErrorMessage(err));
        setChat(null);
      } finally {
        setChatLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadUserAndChats();
  }, [loadUserAndChats]);

  useEffect(() => {
    if (chatId) {
      void loadChat(chatId);
    } else {
      setChat(null);
      setEditingIndex(null);
    }
  }, [chatId, loadChat]);

  const handleSelectChat = (id: string) => {
    navigate(`/admin/users/${userId}/chats/${encodeURIComponent(id)}`);
  };

  const handleDeleteChat = async (summary: ChatSummary) => {
    const confirmed = await confirmDialog({
      title: 'Удалить чат?',
      description: `Удалить чат «${summary.title || summary.id}»?`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    setError(null);
    try {
      await adminService.deleteUserChat(userId, summary.id);
      if (chatId === summary.id) {
        navigate(`/admin/users/${userId}/chats`);
      }
      void loadUserAndChats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSaveChat = async () => {
    if (!chat) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await persistChat(userId, chat, chat.messages, editTitle.trim());
      setChat(updated);
      setEditTitle(updated.title ?? '');
      setNotice('Чат сохранён');
      void loadUserAndChats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditMessage = (index: number) => {
    if (!chat) return;
    setEditingIndex(index);
    setEditContent(chat.messages[index]?.content ?? '');
    setNotice(null);
  };

  const handleSaveMessage = async () => {
    if (!chat || editingIndex === null) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await saveMessageContent(userId, chat, editingIndex, editContent);
      setChat(updated);
      setEditingIndex(null);
      setEditContent('');
      setNotice('Сообщение обновлено');
      void loadUserAndChats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (index: number) => {
    if (!chat) return;
    const confirmed = await confirmDialog({
      title: 'Удалить сообщение?',
      description: `Удалить сообщение #${index + 1}?`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await removeMessage(userId, chat, index);
      setChat(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
        setEditContent('');
      }
      setNotice('Сообщение удалено');
      void loadUserAndChats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminWorkspace
      title="Чаты пользователя"
      description={user ? `${user.displayName || user.email} · ${user.email}` : 'Загрузка профиля…'}
      actions={
        <>
          <Link to="/admin/users" className={adminBtnGhost}>
            <ArrowLeft className="w-3.5 h-3.5" />
            К пользователям
          </Link>
          <button
            type="button"
            onClick={() => void loadUserAndChats()}
            className={adminBtnGhost}
            title="Обновить список"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} />
          </button>
        </>
      }
      bodyClassName="flex flex-col min-h-0"
    >
      {error && <AdminError message={error} />}
      {notice && <AdminSuccess message={notice} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 min-w-0 flex-1">
        <div className="xl:col-span-4 min-w-0">
          <AdminCard title={`Чаты (${chats.length})`}>
            {listLoading && chats.length === 0 ? (
              <AdminLoading />
            ) : chats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">У пользователя нет чатов</p>
            ) : (
              <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
                {chats.map((item) => {
                  const active = chatId === item.id;
                  return (
                    <li key={item.id}>
                      <div
                        className={cn(
                          'flex items-start gap-2 rounded-xl border p-3 transition-colors min-w-0',
                          active
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border hover:bg-accent/50'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectChat(item.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="font-medium text-sm truncate">
                            {item.title || 'Без названия'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            {item.id}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>{item.messageCount} сообщ.</span>
                            {item.modelId && <span>· {item.modelId}</span>}
                            {item.updatedAt && <span>· {formatAdminDate(item.updatedAt)}</span>}
                          </div>
                          {item.lastMessage && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.lastMessage}
                            </p>
                          )}
                        </button>
                        <IconButton
                          variant="danger"
                          label="Удалить чат"
                          onClick={() => void handleDeleteChat(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="xl:col-span-8">
          <AdminCard title={chatId ? 'Детали чата' : 'Выберите чат'}>
            {!chatId && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Выберите чат слева для просмотра и редактирования сообщений
              </p>
            )}

            {chatId && chatLoading && !chat && <AdminLoading />}

            {chat && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <span className="text-muted-foreground">ID:</span>{' '}
                    <span className="font-mono">{chat.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Модель:</span> {chat.modelId || '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session:</span>{' '}
                    <span className="font-mono">{chat.sessionId || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Обновлён:</span>{' '}
                    {formatAdminDate(chat.updatedAt)}
                  </div>
                </div>

                <label htmlFor="admin-user-chat-title" className="block space-y-1">
                  <span className="text-sm font-medium">Заголовок</span>
                  <input
                    id="admin-user-chat-title"
                    name="chatTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={adminInput}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveChat()}
                    disabled={saving}
                    className={adminBtnPrimary}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Сохранение…' : 'Сохранить чат'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteChat({ id: chat.id, messageCount: chat.messages.length })}
                    disabled={saving}
                    className={adminBtnDanger}
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить чат
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Сообщения ({chat.messages.length})
                  </h3>
                  {chat.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Сообщений нет</p>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {chat.messages.map((msg, index) => {
                        const isEditing = editingIndex === index;
                        return (
                          <div
                            key={`${index}-${msg.role}-${String(msg.timestamp ?? '')}`}
                            className="rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeClass(msg.role)}`}
                                >
                                  {roleLabel(msg.role)}
                                </span>
                                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                {msg.timestamp != null && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatAdminTimestamp(msg.timestamp)}
                                  </span>
                                )}
                                {msg.model && (
                                  <span className="text-xs text-muted-foreground">· {msg.model}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditMessage(index)}
                                    className="p-1.5 rounded hover:bg-accent/70"
                                    title="Редактировать"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <IconButton
                                  variant="danger"
                                  size="sm"
                                  label="Удалить сообщение"
                                  onClick={() => void handleDeleteMessage(index)}
                                  disabled={saving}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </IconButton>
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2">
                                <label htmlFor={`admin-user-chat-message-${index}`} className="sr-only">
                                  Содержимое сообщения
                                </label>
                                <textarea
                                  id={`admin-user-chat-message-${index}`}
                                  name="messageContent"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  rows={6}
                                  className={adminTextarea}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveMessage()}
                                    disabled={saving}
                                    className={adminBtnPrimary}
                                  >
                                    Сохранить
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingIndex(null);
                                      setEditContent('');
                                    }}
                                    className={adminBtnGhost}
                                  >
                                    <X className="w-3.5 h-3.5 inline" /> Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <pre className="text-sm whitespace-pre-wrap break-words font-sans text-foreground/80">
                                {msg.content || '—'}
                              </pre>
                            )}

                            {msg.tool_calls && msg.tool_calls.length > 0 && (
                              <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-muted-foreground">
                                  Tool calls ({msg.tool_calls.length})
                                </summary>
                                <pre className="mt-1 p-2 rounded bg-accent dark:bg-background overflow-x-auto">
                                  {JSON.stringify(msg.tool_calls, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </AdminWorkspace>
  );
};

export default AdminUserChatsPage;
