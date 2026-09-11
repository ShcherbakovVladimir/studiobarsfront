import React, { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import adminService from '../../services/adminService';
import type { RuntimeConfig } from '../../types';
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
  adminTextarea,
} from './adminUi';
import { getErrorMessage } from './adminUtils';
import { showSuccessToast } from '../../services/toastService';

const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<RuntimeConfig | null>(null);
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applySettings = (next: RuntimeConfig) => {
    setSettings(next);
    setJsonDraft(JSON.stringify(next, null, 2));
    setJsonError(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getSettings();
      applySettings(res.settings);
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
      const res = await adminService.updateSettings(settings);
      applySettings(res.settings);
      setSuccess('Настройки сохранены');
      showSuccessToast('Настройки сохранены');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as RuntimeConfig;
      applySettings(parsed);
      setSuccess('JSON применён к форме — нажмите «Сохранить»');
    } catch {
      setJsonError('Некорректный JSON');
    }
  };

  if (loading && !settings) {
    return (
      <AdminWorkspace title="Настройки" description="Конфиг сервера">
        <AdminLoading />
      </AdminWorkspace>
    );
  }

  return (
    <AdminWorkspace
      title="Настройки"
      description="Runtime config для всего приложения"
      actions={
        <>
          <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !settings}
            className={adminBtnPrimary}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      {error && <AdminError message={error} />}
      {success && <AdminSuccess message={success} />}

      {settings && (
        <div className="space-y-3 min-w-0">
          <AdminCard title="Модель по умолчанию">
            <AdminField label="ID модели" htmlFor="admin-settings-default-model">
              <input
                id="admin-settings-default-model"
                name="defaultModelId"
                type="text"
                value={settings.defaultModelId}
                onChange={(e) => setSettings({ ...settings, defaultModelId: e.target.value })}
                className={adminInput}
              />
            </AdminField>
          </AdminCard>

          <AdminCard title="Возможности">
            <div className="space-y-2">
              {(
                [
                  ['ragEnabled', 'RAG'],
                  ['supportsTools', 'Инструменты'],
                  ['bitrix24Enabled', 'Bitrix24'],
                  ['inferenceLabEnabled', 'Лаборатория инференса'],
                  ['inferenceLabAdminOnly', 'Инференс только для админов'],
                ] as const
              ).map(([key, label]) => (
                <AdminCheck
                  key={key}
                  id={`admin-settings-feature-${key}`}
                  checked={Boolean(settings.features[key])}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      features: { ...settings.features, [key]: checked },
                    })
                  }
                >
                  {label}
                </AdminCheck>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Чат по умолчанию">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="temperature" htmlFor="admin-settings-chat-temperature">
                <input
                  id="admin-settings-chat-temperature"
                  name="chatTemperature"
                  type="number"
                  step="0.1"
                  value={settings.chatDefaults?.temperature ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatDefaults: {
                        ...settings.chatDefaults,
                        temperature: Number(e.target.value),
                      },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="maxTokens" htmlFor="admin-settings-chat-max-tokens">
                <input
                  id="admin-settings-chat-max-tokens"
                  name="chatMaxTokens"
                  type="number"
                  value={settings.chatDefaults?.maxTokens ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatDefaults: {
                        ...settings.chatDefaults,
                        maxTokens: Number(e.target.value),
                      },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField
                label="Системный промпт"
                htmlFor="admin-settings-chat-prompt"
                className="sm:col-span-2"
              >
                <textarea
                  id="admin-settings-chat-prompt"
                  name="chatSystemPrompt"
                  rows={3}
                  value={settings.chatDefaults?.systemPrompt ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      chatDefaults: {
                        ...settings.chatDefaults,
                        systemPrompt: e.target.value,
                      },
                    })
                  }
                  className={adminTextarea}
                />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard title="RAG по умолчанию">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="temperature" htmlFor="admin-settings-rag-temperature">
                <input
                  id="admin-settings-rag-temperature"
                  type="number"
                  step="0.1"
                  value={settings.ragDefaults?.temperature ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: {
                        ...settings.ragDefaults,
                        temperature: Number(e.target.value),
                      },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="topP" htmlFor="admin-settings-rag-top-p">
                <input
                  id="admin-settings-rag-top-p"
                  type="number"
                  step="0.05"
                  value={settings.ragDefaults?.topP ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: { ...settings.ragDefaults, topP: Number(e.target.value) },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="limit" htmlFor="admin-settings-rag-limit">
                <input
                  id="admin-settings-rag-limit"
                  type="number"
                  value={settings.ragDefaults?.limit ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: { ...settings.ragDefaults, limit: Number(e.target.value) },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField label="relevanceScore" htmlFor="admin-settings-rag-score">
                <input
                  id="admin-settings-rag-score"
                  type="number"
                  step="0.05"
                  value={settings.ragDefaults?.relevanceScore ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: {
                        ...settings.ragDefaults,
                        relevanceScore: Number(e.target.value),
                      },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminCheck
                id="admin-settings-rag-thinking"
                checked={Boolean(settings.ragDefaults?.enableThinking)}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    ragDefaults: { ...settings.ragDefaults, enableThinking: checked },
                  })
                }
              >
                Thinking
              </AdminCheck>
              <AdminCheck
                id="admin-settings-rag-preserve"
                checked={Boolean(settings.ragDefaults?.preserveThinking)}
                onChange={(checked) =>
                  setSettings({
                    ...settings,
                    ragDefaults: { ...settings.ragDefaults, preserveThinking: checked },
                  })
                }
              >
                Сохранять thinking
              </AdminCheck>
              <AdminField label="qwenMode" htmlFor="admin-settings-rag-qwen">
                <input
                  id="admin-settings-rag-qwen"
                  type="text"
                  value={settings.ragDefaults?.qwenMode ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: { ...settings.ragDefaults, qwenMode: e.target.value },
                    })
                  }
                  className={adminInput}
                />
              </AdminField>
              <AdminField
                label="Системный промпт RAG"
                htmlFor="admin-settings-rag-prompt"
                className="sm:col-span-2"
              >
                <textarea
                  id="admin-settings-rag-prompt"
                  rows={3}
                  value={settings.ragDefaults?.systemPrompt ?? ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragDefaults: { ...settings.ragDefaults, systemPrompt: e.target.value },
                    })
                  }
                  className={adminTextarea}
                />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard title="URL сервисов">
            <div className="space-y-2">
              {(
                [
                  ['chatApiUrl', 'Chat API'],
                  ['ragApiUrl', 'RAG API'],
                  ['llamaApiUrl', 'Llama API'],
                  ['wsUrl', 'WebSocket'],
                  ['finetuneWsUrl', 'Finetune WS'],
                  ['errorReportUrl', 'Отчёты об ошибках'],
                ] as const
              ).map(([key, label]) => (
                <AdminField key={key} label={label} htmlFor={`admin-settings-url-${key}`}>
                  <input
                    id={`admin-settings-url-${key}`}
                    name={`url-${key}`}
                    type="text"
                    value={settings.urls?.[key] ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        urls: { ...settings.urls, [key]: e.target.value },
                      })
                    }
                    className={`${adminInput} font-mono`}
                  />
                </AdminField>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="JSON (полный конфиг)">
            <textarea
              id="admin-settings-json"
              name="settingsJson"
              value={jsonDraft}
              onChange={(e) => {
                setJsonDraft(e.target.value);
                setJsonError(null);
              }}
              rows={12}
              className={`${adminTextarea} font-mono`}
            />
            {jsonError && <p className="mt-2 text-xs text-destructive">{jsonError}</p>}
            <button type="button" onClick={applyJson} className={`${adminBtnGhost} mt-2`}>
              Применить JSON к форме
            </button>
          </AdminCard>
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminSettingsPage;
