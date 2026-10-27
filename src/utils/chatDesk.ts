import type { ChatMessage } from '../types';

const PIN_KEY = 'studioxlam_pinned_chat_ids';
const PROMPT_KEY = 'studioxlam_prompt_library';
const SCROLL_KEY = 'studioxlam_chat_autoscroll';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище переполнено — шаблоны и закрепления остаются в памяти вкладки */
  }
}

export function readPinnedChatIds(): string[] {
  const rows = readJson<unknown>(PIN_KEY, []);
  return Array.isArray(rows) ? rows.filter((id): id is string => typeof id === 'string') : [];
}

export function writePinnedChatIds(ids: string[]): void {
  writeJson(PIN_KEY, ids);
}

export function readPromptLibrary(): PromptTemplate[] {
  const rows = readJson<unknown>(PROMPT_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Partial<PromptTemplate>;
    if (!item.id || !item.title || !item.content) return [];
    return [{ id: item.id, title: item.title, content: item.content }];
  });
}

export function writePromptLibrary(prompts: PromptTemplate[]): void {
  writeJson(PROMPT_KEY, prompts);
}

export function readAutoScroll(): boolean {
  return localStorage.getItem(SCROLL_KEY) !== '0';
}

export function writeAutoScroll(enabled: boolean): void {
  localStorage.setItem(SCROLL_KEY, enabled ? '1' : '0');
}

export function downloadTextFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function chatToMarkdown(title: string, messages: ChatMessage[]): string {
  const lines = [`# ${title || 'Чат'}`, ''];
  for (const message of messages) {
    if (!message.content?.trim() || message.isStreaming || message.isError) continue;
    const who = message.role === 'user' ? 'Вы' : message.role === 'assistant' ? 'Ассистент' : message.role;
    lines.push(`## ${who}`, '', message.content, '');
  }
  return lines.join('\n');
}

export function chatToExportJson(title: string, messages: ChatMessage[]): string {
  return JSON.stringify(
    {
      title,
      messages: messages
        .filter((message) => message.content?.trim() && !message.isStreaming && !message.isError)
        .map((message) => ({ role: message.role, content: message.content })),
    },
    null,
    2
  );
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function messagesOf(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ChatMessage[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const item = row as { role?: unknown; content?: unknown };
    const role = item.role === 'user' || item.role === 'assistant' || item.role === 'system' ? item.role : null;
    const content = textOf(item.content).slice(0, 50_000);
    if (!role || !content.trim()) continue;
    messages.push({ role, content });
  }
  return messages.slice(-100);
}

function titledMessages(value: unknown): { title: string; messages: ChatMessage[] } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as {
    title?: unknown;
    messages?: unknown;
    chat?: { title?: unknown; messages?: unknown; history?: { messages?: unknown } };
  };
  const nested = row.chat;
  const messages = messagesOf(row.messages ?? nested?.messages ?? nested?.history?.messages);
  if (messages.length === 0) return null;
  const title =
    (typeof row.title === 'string' && row.title) ||
    (typeof nested?.title === 'string' && nested.title) ||
    'Импорт';
  return { title, messages };
}

/** Наш JSON и выгрузка Open WebUI: объект, `{ chat }` или массив чатов. */
export function parseImportedChats(raw: unknown): { title: string; messages: ChatMessage[] }[] {
  if (Array.isArray(raw)) {
    return raw.map(titledMessages).filter((row): row is { title: string; messages: ChatMessage[] } => Boolean(row));
  }
  const one = titledMessages(raw);
  return one ? [one] : [];
}

export function quoteChat(title: string, messages: ChatMessage[]): string {
  const lines = [`Контекст из чата «${title || 'Чат'}»:`];
  let used = lines[0]?.length ?? 0;
  for (const message of messages.slice(-20)) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const who = message.role === 'user' ? 'Вы' : 'Ассистент';
    const line = `${who}: ${message.content.replace(/\s+/g, ' ').trim()}`;
    if (used + line.length > 8000) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join('\n');
}

export function safeFileSlug(title: string): string {
  const slug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return slug.slice(0, 40) || 'chat';
}
