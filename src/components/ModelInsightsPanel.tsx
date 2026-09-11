// /home/user/projects/studioxlam/src/components/ModelInsightsPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  llamaApi,
  ModelInsights,
  ResourceEstimation,
  AutoConfiguration,
  hasModelInsightsData,
  isResourceEstimationComplete,
} from '../services/llamaService';
import { getErrorMessage } from '../utils/errorUtils';
import { InlineError, InlineWarning } from './ui/alert-banner';
import { MetricCard, MetricSection, MetricRow } from './ui/metric-card';
import { StatusPill } from './ui/status-pill';
import { LoadingState, EmptyState } from './ui/page-states';
import { ResultPanel } from './ui/result-panel';
import { SelectMenu } from './ui/select-menu';
import { toolBtnGhost, toolBtnPrimary, toolCard, toolTitle } from './ui/tool-surface';
import { cn } from '../lib/utils';

interface ModelInsightsPanelProps {
  modelId: string;
  isDarkMode: boolean;
}

const ModelInsightsPanel: React.FC<ModelInsightsPanelProps> = ({ modelId, isDarkMode }) => {
  const [insights, setInsights] = useState<ModelInsights | null>(null);
  const [resourceEstimation, setResourceEstimation] = useState<ResourceEstimation | null>(null);
  const [autoConfiguration, setAutoConfiguration] = useState<AutoConfiguration | null>(null);
  const [loading, setLoading] = useState({ insights: false, resources: false, auto: false });
  const [estimationOptions, setEstimationOptions] = useState({
    gpuLayers: 35,
    contextSize: 4096,
    batchSize: 1,
    sequences: 1
  });
  const [autoConfigOptions, setAutoConfigOptions] = useState({
    targetGpuLayers: 'auto' as 'auto' | 'max' | number,
    targetContextSize: 4096,
    embeddingContext: false,
    flashAttention: true
  });
  const [errors, setErrors] = useState({
    insights: null as string | null,
    resources: null as string | null,
    auto: null as string | null,
  });

  const loadInsights = useCallback(async () => {
    setLoading(prev => ({ ...prev, insights: true }));
    setErrors(prev => ({ ...prev, insights: null }));
    try {
      const response = await llamaApi.getModelInsights();
      if (response.success && hasModelInsightsData(response.insights)) {
        setInsights(response.insights ?? null);
      } else if (response.success) {
        setInsights(null);
        setErrors(prev => ({ ...prev, insights: 'Информация о модели недоступна' }));
      } else {
        setInsights(null);
        setErrors(prev => ({
          ...prev,
          insights: response.error ?? 'Не удалось загрузить информацию о модели',
        }));
      }
    } catch (err) {
      console.error('Error loading insights:', err);
      setInsights(null);
      setErrors(prev => ({ ...prev, insights: getErrorMessage(err) }));
    } finally {
      setLoading(prev => ({ ...prev, insights: false }));
    }
  }, []);

  const estimateResources = useCallback(async () => {
    if (!modelId) {
      setResourceEstimation(null);
      setErrors(prev => ({ ...prev, resources: 'Модель не выбрана' }));
      return;
    }

    setLoading(prev => ({ ...prev, resources: true }));
    setErrors(prev => ({ ...prev, resources: null }));
    try {
      const response = await llamaApi.estimateResources({
        modelId,
        ...estimationOptions,
      });
      if (response.success && isResourceEstimationComplete(response.requirements)) {
        setResourceEstimation(response.requirements ?? null);
      } else if (response.success) {
        setResourceEstimation(null);
        setErrors(prev => ({ ...prev, resources: 'Сервер не вернул оценку ресурсов' }));
      } else {
        setResourceEstimation(null);
        setErrors(prev => ({
          ...prev,
          resources: response.error ?? 'Не удалось рассчитать ресурсы',
        }));
      }
    } catch (err) {
      console.error('Error estimating resources:', err);
      setResourceEstimation(null);
      setErrors(prev => ({ ...prev, resources: getErrorMessage(err) }));
    } finally {
      setLoading(prev => ({ ...prev, resources: false }));
    }
  }, [modelId, estimationOptions]);

  useEffect(() => {
    if (modelId) {
      loadInsights();
      estimateResources();
    }
  }, [modelId, loadInsights, estimateResources]);

  const getAutoConfiguration = async () => {
    setLoading(prev => ({ ...prev, auto: true }));
    setErrors(prev => ({ ...prev, auto: null }));
    try {
      const response = await llamaApi.autoConfigure(autoConfigOptions);
      if (response.success) {
        setAutoConfiguration(response.configuration ?? null);
        if (!response.configuration) {
          setErrors(prev => ({ ...prev, auto: 'Сервер не вернул конфигурацию' }));
        }
      } else {
        setAutoConfiguration(null);
        setErrors(prev => ({
          ...prev,
          auto: response.error ?? 'Не удалось выполнить автонастройку',
        }));
      }
    } catch (err) {
      console.error('Error getting auto configuration:', err);
      setAutoConfiguration(null);
      setErrors(prev => ({ ...prev, auto: getErrorMessage(err) }));
    } finally {
      setLoading(prev => ({ ...prev, auto: false }));
    }
  };

  const updateEstimationOption = (key: string, value: number) => {
    const newOptions = { ...estimationOptions, [key]: value };
    setEstimationOptions(newOptions);
  };

  const renderInsightBadge = (value: boolean, label: string) => (
    <StatusPill variant={value ? 'success' : 'error'}>
      {label}: {value ? '✓' : '✗'}
    </StatusPill>
  );

  return (
    <div className="space-y-3 min-w-0">
      <div className={cn(toolCard, "space-y-3")}>
        <div className="flex justify-between items-center gap-2">
          <h3 className={toolTitle}>Инсайты</h3>
          <button
            type="button"
            onClick={() => void loadInsights()}
            disabled={loading.insights}
            className={toolBtnGhost}
          >
            {loading.insights ? 'Загрузка…' : 'Обновить'}
          </button>
        </div>

        <InlineError
          message={errors.insights}
          onDismiss={() => setErrors(prev => ({ ...prev, insights: null }))}
          className="mb-4"
        />

        {loading.insights ? (
          <LoadingState />
        ) : hasModelInsightsData(insights) ? (
          <div className="space-y-4">
            {insights?.model && (
              <MetricSection title="Модель" theme="default">
                <div className="space-y-2">
                  {insights.model.name && (
                    <MetricRow label="Название:" value={insights.model.name} theme="default" />
                  )}
                  {insights.model.size && (
                    <MetricRow label="Размер:" value={insights.model.size} theme="default" />
                  )}
                  {insights.model.parameters && (
                    <MetricRow label="Параметры:" value={insights.model.parameters} theme="default" />
                  )}
                  {insights.model.chatTemplate && (
                    <MetricRow label="Шаблон чата:" value={insights.model.chatTemplate} theme="default" />
                  )}
                </div>
              </MetricSection>
            )}

            {insights?.performance && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard
                  label="GPU Layers"
                  value={insights.performance.gpuLayers ?? '—'}
                />
                <MetricCard
                  label="Размер контекста"
                  value={insights.performance.contextSize?.toLocaleString() ?? '—'}
                />
                <MetricCard
                  label="Память"
                  value={insights.performance.memoryUsage ?? '—'}
                />
                <MetricCard
                  label="Uptime"
                  value={
                    insights.performance.uptime != null
                      ? `${Math.floor(insights.performance.uptime / 60)} мин`
                      : '—'
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {insights?.performance ? (
                <>
                  {insights.performance.flashAttention != null &&
                    renderInsightBadge(insights.performance.flashAttention, 'Flash Attention')}
                  {insights.model?.isInstruct != null &&
                    renderInsightBadge(insights.model.isInstruct, 'Instruct')}
                  {insights.model?.supportsTools != null &&
                    renderInsightBadge(insights.model.supportsTools, 'Tools')}
                </>
              ) : (
                <>
                  {insights?.flashAttentionSupported != null &&
                    renderInsightBadge(insights.flashAttentionSupported, 'Flash Attention')}
                  {insights?.hasEncoder != null &&
                    renderInsightBadge(insights.hasEncoder, 'Encoder')}
                  {insights?.hasDecoder != null &&
                    renderInsightBadge(insights.hasDecoder, 'Decoder')}
                  {insights?.isRecurrent != null &&
                    renderInsightBadge(insights.isRecurrent, 'Recurrent')}
                  {insights?.supportsRanking != null &&
                    renderInsightBadge(insights.supportsRanking, 'Ranking')}
                </>
              )}
            </div>

            {insights?.model?.capabilities && insights.model.capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {insights.model.capabilities.map((capability) => (
                  <StatusPill key={capability} variant="neutral">{capability}</StatusPill>
                ))}
              </div>
            )}

            {insights?.sessions && (
              <MetricSection title="Сессии" theme="default">
                <div className="space-y-2">
                  <MetricRow label="Активные:" value={insights.sessions.active ?? 0} theme="default" />
                  <MetricRow
                    label="Сообщений в истории:"
                    value={insights.sessions.totalHistoryMessages ?? 0}
                    theme="default"
                  />
                </div>
              </MetricSection>
            )}

            {insights?.recommendations && insights.recommendations.length > 0 && (
              <InlineWarning className="p-3">
                <h4 className="font-medium mb-2">Рекомендации:</h4>
                <ul className="space-y-1">
                  {insights.recommendations.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </InlineWarning>
            )}

            {insights?.warnings && insights.warnings.length > 0 && (
              <InlineWarning className="p-3">
                <h4 className="font-medium mb-2">Предупреждения:</h4>
                <ul className="space-y-1">
                  {insights.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </InlineWarning>
            )}
          </div>
        ) : (
          <EmptyState
            message={errors.insights ? 'См. сообщение об ошибке выше' : 'Информация о модели недоступна'}
          />
        )}
      </div>

      <div className={cn(toolCard, "space-y-3")}>
        <h3 className={toolTitle}>Оценка ресурсов</h3>

        <InlineError
          message={errors.resources}
          onDismiss={() => setErrors(prev => ({ ...prev, resources: null }))}
          className="mb-4"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-foreground/80">Параметры оценки</h4>

            <div>
              <label
                htmlFor="insights-gpu-layers"
                className="block text-sm text-muted-foreground mb-1"
              >
                GPU Layers: {estimationOptions.gpuLayers}
              </label>
              <input
                id="insights-gpu-layers"
                name="gpuLayers"
                type="range"
                min="0"
                max="100"
                value={estimationOptions.gpuLayers}
                onChange={(e) => updateEstimationOption('gpuLayers', parseInt(e.target.value))}
                className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>CPU Only</span>
                <span>Mixed</span>
                <span>GPU Max</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="insights-context-size"
                className="block text-sm text-muted-foreground mb-1"
              >
                Context Size: {estimationOptions.contextSize}
              </label>
              <SelectMenu
                aria-label="Размер контекста"
                value={String(estimationOptions.contextSize)}
                onChange={(value) => updateEstimationOption('contextSize', parseInt(value, 10))}
                options={[
                  { value: '1024', label: '1024 токенов' },
                  { value: '2048', label: '2048 токенов' },
                  { value: '4096', label: '4096 токенов' },
                  { value: '8192', label: '8192 токенов' },
                  { value: '16384', label: '16384 токенов' },
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => void estimateResources()}
              disabled={loading.resources}
              className={toolBtnPrimary}
            >
              {loading.resources ? 'Расчёт…' : 'Рассчитать ресурсы'}
            </button>
          </div>

          <div>
            {isResourceEstimationComplete(resourceEstimation) ? (
              <div className="space-y-4">
                {resourceEstimation?.modelInfo && (
                  <MetricSection title="Модель" theme="default">
                    <div className="space-y-2">
                      {resourceEstimation.modelInfo.name && (
                        <MetricRow
                          label="Название:"
                          value={resourceEstimation.modelInfo.name}
                          theme="default"
                        />
                      )}
                      {resourceEstimation.modelInfo.size && (
                        <MetricRow
                          label="Размер:"
                          value={resourceEstimation.modelInfo.size}
                          theme="default"
                        />
                      )}
                    </div>
                  </MetricSection>
                )}

                {resourceEstimation?.parameters && (
                  <MetricSection title="Параметры оценки" theme="default">
                    <div className="space-y-2">
                      {resourceEstimation.parameters.gpuLayers != null && (
                        <MetricRow
                          label="GPU Layers:"
                          value={resourceEstimation.parameters.gpuLayers}
                          theme="default"
                        />
                      )}
                      {resourceEstimation.parameters.contextSize != null && (
                        <MetricRow
                          label="Context Size:"
                          value={resourceEstimation.parameters.contextSize.toLocaleString()}
                          theme="default"
                        />
                      )}
                    </div>
                  </MetricSection>
                )}

                <MetricSection title="Оценка потребления" theme="default">
                  <div className="space-y-2">
                    <MetricRow
                      label="VRAM:"
                      value={resourceEstimation!.total.vram}
                      theme="default"
                      valueClassName="text-lg"
                    />
                    <MetricRow
                      label="RAM:"
                      value={resourceEstimation!.total.ram}
                      theme="default"
                      valueClassName="text-lg"
                    />
                  </div>
                </MetricSection>

                {resourceEstimation?.feasibility && (
                  <div className="flex flex-wrap gap-2">
                    {resourceEstimation.feasibility.hasEnoughVRAM != null &&
                      renderInsightBadge(
                        resourceEstimation.feasibility.hasEnoughVRAM,
                        'Достаточно VRAM'
                      )}
                    {resourceEstimation.feasibility.hasEnoughRAM != null &&
                      renderInsightBadge(
                        resourceEstimation.feasibility.hasEnoughRAM,
                        'Достаточно RAM'
                      )}
                  </div>
                )}

                {resourceEstimation?.system && (
                  <MetricSection title="Система" theme="default">
                    <div className="space-y-2">
                      {resourceEstimation.system.availableRAMGB && (
                        <MetricRow
                          label="Доступно RAM:"
                          value={`${resourceEstimation.system.availableRAMGB} GB`}
                          theme="default"
                        />
                      )}
                      {resourceEstimation.system.cpuCores != null && (
                        <MetricRow
                          label="CPU ядер:"
                          value={resourceEstimation.system.cpuCores}
                          theme="default"
                        />
                      )}
                    </div>
                  </MetricSection>
                )}
              </div>
            ) : !loading.resources && !errors.resources ? (
              <EmptyState message="Нажмите «Рассчитать ресурсы» для получения оценки" />
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(toolCard, "space-y-3")}>
        <h3 className={toolTitle}>Автоконфиг</h3>

        <InlineError
          message={errors.auto}
          onDismiss={() => setErrors(prev => ({ ...prev, auto: null }))}
          className="mb-4"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="insights-gpu-layers-target"
                className="block text-sm text-muted-foreground mb-1"
              >
                GPU Layers Target
              </label>
              <SelectMenu
                aria-label="GPU Layers Target"
                value={String(autoConfigOptions.targetGpuLayers)}
                onChange={(value) => setAutoConfigOptions({
                  ...autoConfigOptions,
                  targetGpuLayers: value === 'auto' ? 'auto' : value === 'max' ? 'max' : parseInt(value, 10)
                })}
                options={[
                  { value: 'auto', label: 'Auto (рекомендуется)' },
                  { value: 'max', label: 'Max (максимально на GPU)' },
                  { value: '0', label: '0 (CPU only)' },
                  { value: '20', label: '20 слоёв' },
                  { value: '35', label: '35 слоёв' },
                  { value: '50', label: '50 слоёв' },
                ]}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="embeddingContext"
                name="embeddingContext"
                checked={autoConfigOptions.embeddingContext}
                onChange={(e) => setAutoConfigOptions({
                  ...autoConfigOptions,
                  embeddingContext: e.target.checked
                })}
                className="rounded border-border"
              />
              <label htmlFor="embeddingContext" className="text-sm text-muted-foreground">
                Использовать для embedding
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="flashAttention"
                name="flashAttention"
                checked={autoConfigOptions.flashAttention}
                onChange={(e) => setAutoConfigOptions({
                  ...autoConfigOptions,
                  flashAttention: e.target.checked
                })}
                className="rounded border-border"
              />
              <label htmlFor="flashAttention" className="text-sm text-muted-foreground">
                Использовать Flash Attention
              </label>
            </div>

            <button
              type="button"
              onClick={() => void getAutoConfiguration()}
              disabled={loading.auto}
              className={toolBtnPrimary}
            >
              {loading.auto ? 'Настройка…' : 'Автонастройка'}
            </button>
          </div>

          <div>
            {autoConfiguration ? (
              <ResultPanel
                success={autoConfiguration.recommended}
                title={autoConfiguration.recommended ? 'Рекомендуемая конфигурация' : 'Конфигурация'}
                className="p-4"
              >
                <div className="flex justify-end mb-2">
                  <StatusPill variant="neutral">
                    Score: {autoConfiguration.score.toFixed(1)}
                  </StatusPill>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <MetricCard label="GPU Layers" value={autoConfiguration.gpuLayers} className="p-2" />
                  <MetricCard label="Context Size" value={autoConfiguration.contextSize} className="p-2" />
                  <MetricCard label="Compatibility" value={autoConfiguration.compatibilityScore.toFixed(1)} className="p-2" />
                  <MetricCard label="Bonus Score" value={autoConfiguration.bonusScore.toFixed(1)} className="p-2" />
                </div>

                <MetricSection title="VRAM" theme="default">
                  <div className="space-y-2">
                    <MetricRow label="Модель:" value={autoConfiguration.memory.vram.model} theme="default" />
                    <MetricRow label="Контекст:" value={autoConfiguration.memory.vram.context} theme="default" />
                    <MetricRow label="Всего:" value={autoConfiguration.memory.vram.total} theme="default" valueClassName="text-lg" />
                  </div>
                </MetricSection>

                <MetricSection title="RAM" theme="default" className="mt-3">
                  <div className="space-y-2">
                    <MetricRow label="Модель:" value={autoConfiguration.memory.ram.model} theme="default" />
                    <MetricRow label="Контекст:" value={autoConfiguration.memory.ram.context} theme="default" />
                    <MetricRow label="Всего:" value={autoConfiguration.memory.ram.total} theme="default" valueClassName="text-lg" />
                  </div>
                </MetricSection>
              </ResultPanel>
            ) : !loading.auto && !errors.auto ? (
              <EmptyState message="Нажмите «Автонастройка» для получения рекомендаций" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelInsightsPanel;
