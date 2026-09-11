import React, { useState, useEffect } from 'react';
import { llamaApi, SystemInfo } from '../services/llamaService';
import { InlineError } from './ui/alert-banner';
import { PanelCard } from './ui/panel-card';
import { IconButton } from './ui/icon-button';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';

interface SystemInfoPanelProps {
  isDarkMode: boolean;
  embedded?: boolean;
}

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const SystemInfoPanel: React.FC<SystemInfoPanelProps> = ({ embedded = false }) => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await llamaApi.getSystemInfo();
      if (response?.system) {
        setInfo(response);
      } else {
        setError('Неверный формат ответа от сервера');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInfo();
  }, []);

  const InfoRow = ({ label, value }: { label: string; value: string | number | boolean }) => (
    <div className="flex justify-between py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground font-mono text-right truncate ml-4">
        {typeof value === 'boolean' ? (value ? 'Да' : 'Нет') : value}
      </span>
    </div>
  );

  const statusLabel = error ? 'Ошибка' : loading ? 'Обновление…' : info ? 'Готово' : 'Нет данных';

  const refreshButton = (
    <IconButton
      label="Обновить"
      onClick={() => void fetchInfo()}
      disabled={loading}
      className="h-8 w-8"
    >
      <RefreshIcon />
    </IconButton>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!embedded && (
        <header className={celestia.appHeader}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="shrink-0 text-sm font-semibold text-foreground">Система</h2>
              <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    error && 'bg-destructive',
                    loading && !error && 'bg-foreground/30 animate-pulse',
                    !loading && !error && info && 'bg-foreground/40',
                    !loading && !error && !info && 'bg-foreground/20'
                  )}
                />
                {statusLabel}
              </span>
              {info?.model?.activeModel && (
                <span
                  className="hidden md:inline min-w-0 truncate font-mono text-xs text-muted-foreground"
                  title={info.model.activeModel}
                >
                  {info.model.activeModel}
                </span>
              )}
            </div>
            {refreshButton}
          </div>
        </header>
      )}

      <div className={cn('flex-1 min-h-0 overflow-y-auto', embedded ? 'p-0' : 'p-4 md:p-6')}>
        {embedded && (
          <div className="flex items-center justify-end mb-3">{refreshButton}</div>
        )}

        {error && <InlineError message={`Ошибка: ${error}`} className="mb-4" />}

        {info && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PanelCard className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Хост</h3>
              <div className="space-y-1">
                <InfoRow label="Платформа" value={info.system?.platform || 'N/A'} />
                <InfoRow label="Архитектура" value={info.system?.arch || 'N/A'} />
                <InfoRow label="Node.js" value={info.system?.nodeVersion || 'N/A'} />
                <InfoRow label="CPU Cores" value={info.system?.cpuCores || 'N/A'} />
                <InfoRow label="Память (Total)" value={info.system?.totalMemory || 'N/A'} />
                <InfoRow label="Диск (Free)" value={info.system?.freeDisk || 'N/A'} />
              </div>
            </PanelCard>

            <PanelCard className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">LLAMA Server</h3>
              <div className="space-y-1">
                <InfoRow label="Режим" value={info.llama?.mode || 'OpenAI Proxy'} />
                <InfoRow label="Порт" value={info.llama?.port || 0} />
                <InfoRow label="Статус модели" value={info.model?.modelLoaded ? 'Загружена' : 'Выгружена'} />
                <InfoRow label="Активная модель" value={info.model?.activeModel || 'Нет'} />
                <InfoRow label="Активные сессии" value={info.model?.sessions || 0} />
                <InfoRow label="GPU Offloading" value={info.llama?.supportsGpuOffloading || false} />
                <InfoRow label="Binary Available" value={info.llama?.llamaServerAvailable || false} />
              </div>
            </PanelCard>

            <PanelCard className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Конфигурация</h3>
              <div className="space-y-1">
                <InfoRow label="Директория моделей" value={info.config?.modelsDir || 'N/A'} />
                <InfoRow label="Контекст (Tokens)" value={info.config?.contextSize || 'N/A'} />
                <InfoRow label="Потоки (Threads)" value={info.config?.threads || 'N/A'} />
                <InfoRow label="Слои GPU" value={info.config?.gpuLayers || 'N/A'} />
                <InfoRow label="Flash Attention" value={info.llama?.flashAttention || false} />
              </div>
            </PanelCard>

            <PanelCard className="p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Статистика</h3>
              <div className="space-y-1">
                <InfoRow label="Всего моделей" value={info.model?.totalModels || 0} />
                <InfoRow label="Доступно моделей" value={info.model?.availableModels || 0} />
                <InfoRow label="Chat Template" value={info.llama?.chatTemplate || 'Default'} />
              </div>
            </PanelCard>
          </div>
        )}

        {!info && !loading && !error && (
          <div className="p-8 text-center text-sm text-muted-foreground">Нет данных</div>
        )}
      </div>
    </div>
  );
};

export default SystemInfoPanel;
