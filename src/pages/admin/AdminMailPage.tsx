import React, { useCallback, useEffect, useState } from 'react';
import { Save, Send, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminMailSettings } from '../../types';
import {
  AdminCard,
  AdminCheck,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSuccess,
  AdminWorkspace,
  adminBtnGhost,
  adminBtnPrimary,
  adminInput,
} from './adminUi';
import { getErrorMessage } from './adminUtils';

const AdminMailPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminMailSettings | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getMailSettings();
      setSettings(res.settings);
      setPasswordDraft('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...settings };
      if (passwordDraft) payload.password = passwordDraft;
      else delete payload.password;
      const res = await adminService.updateMailSettings(payload);
      setSettings(res.settings);
      setPasswordDraft('');
      setSuccess('Настройки почты сохранены');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const res = await adminService.testMail(testTo.trim() || undefined);
      setSuccess(res.message ?? 'Тестовое письмо отправлено');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  if (loading && !settings) {
    return (
      <AdminWorkspace title="Почта" description="SMTP">
        <AdminLoading />
      </AdminWorkspace>
    );
  }

  return (
    <AdminWorkspace
      title="Почта"
      description="SMTP для уведомлений"
      actions={
        <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      }
    >
      {error && <AdminError message={error} />}
      {success && <AdminSuccess message={success} />}

      {settings && (
        <div className="space-y-3 min-w-0">
          <AdminCard>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="SMTP-хост" htmlFor="admin-mail-host">
                <input
                  id="admin-mail-host"
                  name="host"
                  type="text"
                  value={String(settings.host ?? '')}
                  onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="Порт" htmlFor="admin-mail-port">
                <input
                  id="admin-mail-port"
                  name="port"
                  type="number"
                  value={settings.port ?? 587}
                  onChange={(e) => setSettings({ ...settings, port: Number(e.target.value) })}
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="Пользователь" htmlFor="admin-mail-user">
                <input
                  id="admin-mail-user"
                  name="user"
                  type="text"
                  autoComplete="username"
                  value={String(settings.user ?? '')}
                  onChange={(e) => setSettings({ ...settings, user: e.target.value })}
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="Пароль" htmlFor="admin-mail-password">
                <input
                  id="admin-mail-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Оставьте пустым, чтобы не менять"
                  value={passwordDraft}
                  onChange={(e) => setPasswordDraft(e.target.value)}
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="От кого (From)" htmlFor="admin-mail-from" className="sm:col-span-2">
                <input
                  id="admin-mail-from"
                  name="from"
                  type="text"
                  value={String(settings.from ?? '')}
                  onChange={(e) => setSettings({ ...settings, from: e.target.value })}
                  className={adminInput}
                />
              </AdminField>
              <AdminCheck
                id="admin-mail-enabled"
                name="enabled"
                checked={settings.enabled ?? false}
                onChange={(checked) => setSettings({ ...settings, enabled: checked })}
              >
                SMTP включён
              </AdminCheck>
              <AdminCheck
                id="admin-mail-secure"
                name="secure"
                checked={settings.secure ?? false}
                onChange={(checked) => setSettings({ ...settings, secure: checked })}
              >
                TLS/SSL (secure)
              </AdminCheck>
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={`${adminBtnPrimary} mt-4`}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </AdminCard>

          <AdminCard title="Тестовая отправка">
            <div className="flex flex-wrap gap-2 min-w-0">
              <label htmlFor="admin-mail-test-to" className="sr-only">
                Email получателя
              </label>
              <input
                id="admin-mail-test-to"
                name="testTo"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="email получателя (необязательно)"
                className={`${adminInput} flex-1 min-w-[12rem]`}
              />
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testing}
                className={adminBtnGhost}
              >
                <Send className="w-3.5 h-3.5" />
                {testing ? 'Отправка…' : 'Отправить тест'}
              </button>
            </div>
          </AdminCard>
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminMailPage;
