import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/apiClient';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/authService';
import { confirmDialog } from '../services/dialogService';
import type { LlmApiKey } from '../types';
import { InlineError, InlineSuccess } from './ui/alert-banner';

function formatWhen(value: string | null): string {
  if (!value) return 'без срока';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
}

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'API_KEY_LIMIT') return 'Активных ключей не больше 10. Отзовите неиспользуемый.';
    if (error.code === 'API_KEY_NOT_FOUND') return 'Ключ не найден или уже отозван.';
    if (error.code === 'API_KEY_SCOPE') return 'Ключ sk-... открывает только /v1, не кабинет. Выход не выполнен.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос';
}

const ApiKeysPanel: React.FC = () => {
  const [keys, setKeys] = useState<LlmApiKey[]>([]);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await listApiKeys();
    setKeys(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listApiKeys()
      .then((rows) => {
        if (!cancelled) setKeys(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    let days: number | undefined;
    if (expiresInDays.trim()) {
      days = Number(expiresInDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        setError('Срок — целое число дней от 1 до 3650. Пустое поле — ключ без срока.');
        return;
      }
    }
    setLoading(true);
    try {
      const created = await createApiKey({ name, expiresInDays: days });
      setRevealed(created.apiKey.key ?? null);
      setMessage(created.message);
      setName('');
      setExpiresInDays('');
      await load();
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (key: LlmApiKey) => {
    const ok = await confirmDialog({
      title: 'Отозвать ключ',
      description: `${key.name || 'Без имени'} (${key.prefix}…) перестанет открывать /v1.`,
      confirmLabel: 'Отозвать',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await revokeApiKey(key.id);
      setMessage('Ключ отозван');
      await load();
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed);
      setMessage('Ключ скопирован. В токен чата он не записывается.');
    } catch {
      setError('Не удалось скопировать. Выделите ключ вручную.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ключ для внешнего клиента: <span className="font-mono">POST /v1/chat/completions</span> с заголовком{' '}
        <span className="font-mono">Authorization: Bearer sk-...</span>. Чат в браузере по-прежнему ходит на{' '}
        <span className="font-mono">POST /api/chat</span> с JWT и этот ключ не подставляет.
      </p>

      {message && <InlineSuccess message={message} />}
      {error && <InlineError message={error} />}

      {revealed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Сохраните ключ: он показывается один раз</p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              aria-label="Секрет API-ключа"
              value={revealed}
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-background px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => void copySecret()}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm"
            >
              Копировать
            </button>
          </div>
        </div>
      )}

      <form onSubmit={(event) => void handleCreate(event)} className="space-y-3">
        <label htmlFor="api-key-name" className="block space-y-1">
          <span className="text-sm font-medium">Имя</span>
          <input
            id="api-key-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="cursor"
            className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
        </label>
        <label htmlFor="api-key-expires" className="block space-y-1">
          <span className="text-sm font-medium">Срок, дней</span>
          <input
            id="api-key-expires"
            name="expiresInDays"
            type="number"
            min={1}
            max={3650}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            placeholder="пусто — без срока"
            className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading || keys.length >= 10}
          className="px-4 py-2 rounded-lg btn-gradient text-sm disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Создать ключ'}
        </button>
      </form>

      <ul className="space-y-2">
        {keys.length === 0 && (
          <li className="text-sm text-muted-foreground">Активных ключей нет.</li>
        )}
        {keys.map((key) => (
          <li key={key.id} className="rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{key.name || 'Без имени'}</div>
                <div className="font-mono text-xs text-muted-foreground">{key.prefix}…</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Создан {formatWhen(key.createdAt)}
                  {' · '}
                  срок {key.expiresAt ? formatWhen(key.expiresAt) : 'без срока'}
                  {key.lastUsedAt ? ` · использован ${formatWhen(key.lastUsedAt)}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(key)}
                disabled={loading}
                className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-red-600 disabled:opacity-50"
              >
                Отозвать
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApiKeysPanel;
