import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw, FlaskConical, Copy } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminOidcSettings } from '../../types';
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

const emptySettings = (): AdminOidcSettings => ({
  enabled: false,
  issuer: '',
  clientId: '',
  scope: 'openid email profile',
  autoProvision: false,
  clientSecretConfigured: false,
  callbackUrl: '',
  ready: false,
  source: 'none',
});

const AdminOidcPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminOidcSettings | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getOidcSettings();
      setSettings(res.settings);
      setSecretDraft('');
    } catch (err) {
      setError(getErrorMessage(err));
      setSettings(emptySettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof AdminOidcSettings>(key: K, value: AdminOidcSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Partial<AdminOidcSettings> = {
        enabled: settings.enabled,
        issuer: settings.issuer.trim(),
        clientId: settings.clientId.trim(),
        scope: settings.scope.trim() || 'openid email profile',
        autoProvision: settings.autoProvision,
      };
      if (secretDraft.trim()) payload.clientSecret = secretDraft.trim();
      const res = await adminService.updateOidcSettings(payload);
      setSettings(res.settings);
      setSecretDraft('');
      setSuccess(res.settings.ready ? 'OIDC сохранён и готов' : 'OIDC сохранён');
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
      const res = await adminService.testOidc();
      if (res.success === false) {
        setError(res.error || res.message || 'Провайдер не ответил');
        return;
      }
      setSuccess(res.message ?? 'Discovery у issuer прошёл');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const copyCallback = async () => {
    const url = settings?.callbackUrl?.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setSuccess('callbackUrl скопирован');
    } catch {
      setError('Не удалось скопировать callbackUrl');
    }
  };

  if (loading && !settings) {
    return (
      <AdminWorkspace title="Корпоративный вход" description="OpenID Connect">
        <AdminLoading />
      </AdminWorkspace>
    );
  }

  if (!settings) return null;

  return (
    <AdminWorkspace
      title="Корпоративный вход"
      description="OIDC в PostgreSQL. Оба API читают одну строку, перезапуск не нужен."
      actions={
        <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      }
    >
      {error && <AdminError message={error} />}
      {success && <AdminSuccess message={success} />}

      <AdminCard title="Провайдер" className="mb-3">
        <div className="space-y-3">
          <AdminCheck
            id="oidc-enabled"
            checked={settings.enabled}
            onChange={(checked) => patch('enabled', checked)}
          >
            Включить корпоративный вход
          </AdminCheck>
          <AdminCheck
            id="oidc-auto"
            checked={settings.autoProvision}
            onChange={(checked) => patch('autoProvision', checked)}
          >
            Автосоздание учётных записей
          </AdminCheck>
          <AdminField label="Issuer" htmlFor="oidc-issuer">
            <input
              id="oidc-issuer"
              name="issuer"
              value={settings.issuer}
              onChange={(event) => patch('issuer', event.target.value)}
              placeholder="https://idp.example.com/realms/almaz"
              className={adminInput}
            />
          </AdminField>
          <AdminField label="Client ID" htmlFor="oidc-client-id">
            <input
              id="oidc-client-id"
              name="clientId"
              value={settings.clientId}
              onChange={(event) => patch('clientId', event.target.value)}
              className={adminInput}
            />
          </AdminField>
          <AdminField
            label={settings.clientSecretConfigured ? 'Client secret (пустое — не менять)' : 'Client secret'}
            htmlFor="oidc-client-secret"
          >
            <input
              id="oidc-client-secret"
              name="clientSecret"
              type="password"
              autoComplete="new-password"
              value={secretDraft}
              onChange={(event) => setSecretDraft(event.target.value)}
              placeholder={settings.clientSecretConfigured ? '••••••••' : ''}
              className={adminInput}
            />
          </AdminField>
          <AdminField label="Scope" htmlFor="oidc-scope">
            <input
              id="oidc-scope"
              name="scope"
              value={settings.scope}
              onChange={(event) => patch('scope', event.target.value)}
              className={adminInput}
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard title="Callback в IdP" className="mb-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Укажите этот URL в клиенте провайдера. Секрет API не отдаёт.
        </p>
        <div className="flex gap-2">
          <input
            id="oidc-callback"
            name="callbackUrl"
            readOnly
            value={settings.callbackUrl ?? ''}
            className={adminInput}
          />
          <button type="button" className={adminBtnGhost} onClick={() => void copyCallback()} title="Копировать">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ready: {settings.ready ? 'да' : 'нет'}
          {settings.source ? ` · source: ${settings.source}` : ''}
          {settings.clientSecretConfigured ? ' · секрет задан' : ' · секрет не задан'}
        </p>
      </AdminCard>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={() => void handleSave()} className={adminBtnPrimary}>
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button type="button" disabled={testing} onClick={() => void handleTest()} className={adminBtnGhost}>
          <FlaskConical className="w-3.5 h-3.5" />
          {testing ? 'Проверка…' : 'Проверить провайдера'}
        </button>
      </div>
    </AdminWorkspace>
  );
};

export default AdminOidcPage;
