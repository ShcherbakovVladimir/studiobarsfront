import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw, FlaskConical } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminIntegrationsSettings } from '../../types';
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

const AdminIntegrationsPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminIntegrationsSettings | null>(null);
  const [webhookDraft, setWebhookDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingBitrix, setTestingBitrix] = useState(false);
  const [testingFinetune, setTestingFinetune] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apply = useCallback((data: AdminIntegrationsSettings) => {
    setSettings({
      bitrix24: {
        enabled: Boolean(data.bitrix24?.enabled),
        clientId: data.bitrix24?.clientId ?? '',
        webhookUrl: data.bitrix24?.webhookUrl ?? '',
        portalDomain: data.bitrix24?.portalDomain ?? '',
        status: data.bitrix24?.status,
      },
      finetune: {
        wsUrl: data.finetune?.wsUrl ?? '',
        status: data.finetune?.status,
      },
    });
    setWebhookDraft('');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getIntegrations();
      apply(res);
    } catch (err) {
      setError(getErrorMessage(err));
      apply({});
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const bitrix24: Record<string, unknown> = {
        enabled: Boolean(settings.bitrix24?.enabled),
        portalDomain: settings.bitrix24?.portalDomain?.trim() || undefined,
        clientId: settings.bitrix24?.clientId?.trim() || undefined,
      };
      if (webhookDraft.trim()) bitrix24.webhookUrl = webhookDraft.trim();
      const res = await adminService.updateIntegrations({
        bitrix24,
        finetune: {
          wsUrl: settings.finetune?.wsUrl?.trim() || undefined,
        },
      });
      apply(res);
      setSuccess('Интеграции сохранены');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTestBitrix = async () => {
    setTestingBitrix(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminService.testBitrix24();
      if (res.success === false) {
        setError(res.error || res.message || 'Bitrix24 не ответил');
        return;
      }
      setSuccess(res.message ?? 'Bitrix24 доступен');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTestingBitrix(false);
    }
  };

  const handleTestFinetune = async () => {
    setTestingFinetune(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminService.testFinetune(settings?.finetune?.wsUrl?.trim() || undefined);
      if (res.success === false) {
        setError(res.error || res.message || 'Finetune WS не ответил');
        return;
      }
      setSuccess(res.message ?? 'Finetune WS доступен');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTestingFinetune(false);
    }
  };

  if (loading && !settings) {
    return (
      <AdminWorkspace title="Интеграции" description="Bitrix24 и Finetune">
        <AdminLoading />
      </AdminWorkspace>
    );
  }

  if (!settings) return null;

  return (
    <AdminWorkspace
      title="Интеграции"
      description="Bitrix24 и WebSocket finetune"
      actions={
        <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      }
    >
      {error && <AdminError message={error} />}
      {success && <AdminSuccess message={success} />}

      <AdminCard title="Bitrix24" className="mb-3">
        <div className="space-y-3">
          <AdminCheck
            id="bitrix-enabled"
            checked={Boolean(settings.bitrix24?.enabled)}
            onChange={(checked) =>
              setSettings((prev) =>
                prev
                  ? { ...prev, bitrix24: { ...prev.bitrix24, enabled: checked } }
                  : prev
              )
            }
          >
            Включить Bitrix24 tools
          </AdminCheck>
          <AdminField label="Portal domain" htmlFor="bitrix-portal">
            <input
              id="bitrix-portal"
              name="portalDomain"
              value={settings.bitrix24?.portalDomain ?? ''}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, bitrix24: { ...prev.bitrix24, portalDomain: event.target.value } }
                    : prev
                )
              }
              placeholder="https://bars-met.bitrix24.ru"
              className={adminInput}
            />
          </AdminField>
          <AdminField label="Client ID" htmlFor="bitrix-client">
            <input
              id="bitrix-client"
              name="clientId"
              value={settings.bitrix24?.clientId ?? ''}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, bitrix24: { ...prev.bitrix24, clientId: event.target.value } }
                    : prev
                )
              }
              className={adminInput}
            />
          </AdminField>
          <AdminField
            label={settings.bitrix24?.webhookUrl ? 'Webhook URL (пустое — не менять)' : 'Webhook URL'}
            htmlFor="bitrix-webhook"
          >
            <input
              id="bitrix-webhook"
              name="webhookUrl"
              type="password"
              autoComplete="new-password"
              value={webhookDraft}
              onChange={(event) => setWebhookDraft(event.target.value)}
              placeholder={settings.bitrix24?.webhookUrl || 'https://…/rest/…'}
              className={adminInput}
            />
          </AdminField>
          {settings.bitrix24?.status && (
            <p className="text-xs text-muted-foreground">status: {settings.bitrix24.status}</p>
          )}
          <button
            type="button"
            disabled={testingBitrix}
            onClick={() => void handleTestBitrix()}
            className={adminBtnGhost}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {testingBitrix ? 'Проверка…' : 'Проверить Bitrix24'}
          </button>
        </div>
      </AdminCard>

      <AdminCard title="Finetune WebSocket" className="mb-3">
        <div className="space-y-3">
          <AdminField label="wsUrl" htmlFor="finetune-ws">
            <input
              id="finetune-ws"
              name="wsUrl"
              value={settings.finetune?.wsUrl ?? ''}
              onChange={(event) =>
                setSettings((prev) =>
                  prev
                    ? { ...prev, finetune: { ...prev.finetune, wsUrl: event.target.value } }
                    : prev
                )
              }
              placeholder="ws://localhost:3001/finetune-ws"
              className={adminInput}
            />
          </AdminField>
          {settings.finetune?.status && (
            <p className="text-xs text-muted-foreground">status: {settings.finetune.status}</p>
          )}
          <button
            type="button"
            disabled={testingFinetune}
            onClick={() => void handleTestFinetune()}
            className={adminBtnGhost}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {testingFinetune ? 'Проверка…' : 'Проверить Finetune WS'}
          </button>
        </div>
      </AdminCard>

      <button type="button" disabled={saving} onClick={() => void handleSave()} className={adminBtnPrimary}>
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Сохранение…' : 'Сохранить'}
      </button>
    </AdminWorkspace>
  );
};

export default AdminIntegrationsPage;
