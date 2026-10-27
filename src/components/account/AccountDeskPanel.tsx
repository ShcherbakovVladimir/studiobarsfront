import React, { useEffect, useState } from 'react';
import { ApiError } from '../../services/apiClient';
import {
  confirmSecondFactor,
  createWebhook,
  deleteWebhook,
  disableSecondFactor,
  listShortcuts,
  listWebhooks,
  saveShortcuts,
  setupSecondFactor,
  type UserWebhook,
} from '../../services/chatDeskService';
import { InlineError, InlineSuccess } from '../ui/alert-banner';

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Ошибка запроса';
}

export const ShortcutsPanel: React.FC = () => {
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [action, setAction] = useState('');
  const [keys, setKeys] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listShortcuts().then(setBindings).catch((err: unknown) => setError(errorText(err)));
  }, []);

  return (
    <div className="space-y-3">
      {message && <InlineSuccess message={message} />}
      {error && <InlineError message={error} />}
      <ul className="space-y-1 text-sm">
        {Object.entries(bindings).map(([name, combo]) => (
          <li key={name} className="flex justify-between gap-2">
            <span>{name}</span>
            <span className="font-mono text-xs">{combo}</span>
          </li>
        ))}
        {Object.keys(bindings).length === 0 && <li className="text-muted-foreground">Сочетаний нет.</li>}
      </ul>
      <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault();
        const next = { ...bindings, [action.trim()]: keys.trim() };
        void saveShortcuts(next)
          .then(() => {
            setBindings(next);
            setAction('');
            setKeys('');
            setMessage('Сочетания сохранены');
            setError(null);
          })
          .catch((err: unknown) => setError(errorText(err)));
      }}>
        <input id="shortcut-action" name="action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="Действие" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input id="shortcut-keys" name="keys" value={keys} onChange={(event) => setKeys(event.target.value)} placeholder="Ctrl+K" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Сохранить</button>
      </form>
    </div>
  );
};

export const WebhooksPanel: React.FC = () => {
  const [hooks, setHooks] = useState<UserWebhook[]>([]);
  const [url, setUrl] = useState('');
  const [completed, setCompleted] = useState(true);
  const [failed, setFailed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => void listWebhooks().then(setHooks).catch((err: unknown) => setError(errorText(err)));
  useEffect(load, []);

  return (
    <div className="space-y-3 text-sm">
      {error && <InlineError message={error} />}
      <ul className="space-y-1">
        {hooks.map((hook) => (
          <li key={hook.id || hook.url} className="flex justify-between gap-2">
            <span className="truncate">{hook.url}</span>
            {hook.id && (
              <button type="button" className="text-xs text-red-600" onClick={() => void deleteWebhook(hook.id as string).then(load).catch((err: unknown) => setError(errorText(err)))}>
                Удалить
              </button>
            )}
          </li>
        ))}
        {hooks.length === 0 && <li className="text-muted-foreground">Вебхуков нет.</li>}
      </ul>
      <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault();
        const events = [completed ? 'chat.completed' : '', failed ? 'chat.failed' : ''].filter(Boolean);
        void createWebhook(url.trim(), events)
          .then(() => {
            setUrl('');
            load();
          })
          .catch((err: unknown) => setError(errorText(err)));
      }}>
        <input id="webhook-url" name="url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/hook" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} /> Ответ готов</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={failed} onChange={(event) => setFailed(event.target.checked)} /> Ответ оборвался</label>
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Добавить</button>
      </form>
    </div>
  );
};

export const SecondFactorPanel: React.FC = () => {
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">Секрет показывается один раз после нажатия. Пока код не подтверждён, вход по паролю не заменяется.</p>
      {message && <InlineSuccess message={message} />}
      {error && <InlineError message={error} />}
      <button type="button" className="rounded-lg border border-border px-3 py-2" onClick={() => {
        setError(null);
        void setupSecondFactor()
          .then((row) => {
            setSecret(row.secret);
            setOtpauth(row.otpauth);
            setMessage('Секрет выпущен. Подтвердите кодом из приложения.');
          })
          .catch((err: unknown) => setError(errorText(err)));
      }}>
        Настроить второй фактор
      </button>
      {secret && (
        <div className="space-y-2 rounded-lg border border-amber-400/50 bg-amber-500/10 p-3">
          <p className="font-mono text-xs break-all">{secret}</p>
          {otpauth && <p className="text-xs break-all text-muted-foreground">{otpauth}</p>}
          <form className="flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            void confirmSecondFactor(code.trim())
              .then(() => {
                setMessage('Второй фактор включён');
                setSecret(null);
                setCode('');
              })
              .catch((err: unknown) => setError(errorText(err)));
          }}>
            <input id="mfa-confirm" name="code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Код" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1" />
            <button type="submit" className="rounded-lg bg-primary px-3 py-1 text-primary-foreground">Подтвердить</button>
          </form>
        </div>
      )}
      <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault();
        void disableSecondFactor(password, disableCode.trim())
          .then(() => setMessage('Второй фактор выключен'))
          .catch((err: unknown) => setError(errorText(err)));
      }}>
        <input id="mfa-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Текущий пароль" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        <input id="mfa-disable-code" name="code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} placeholder="Код, если уже включён" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        <button type="submit" className="rounded-lg border border-border px-3 py-2">Выключить</button>
      </form>
    </div>
  );
};
