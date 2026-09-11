// /home/user/projects/studioxlam/src/components/finetune/ConfigurationPanel.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateConfig } from '../../store/finetuneSlice';
import type { RootState } from '../../store/store';
import type { FinetuneConfigValue } from '../../types';

interface ConfigurationPanelProps {
  isTraining: boolean;
  isStarting: boolean;
  isStopping: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  isMobile?: boolean;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isTraining,
  isStarting,
  isStopping,
  showAdvanced,
  onToggleAdvanced,
}) => {
  const dispatch = useDispatch();
  const config = useSelector((state: RootState) => state.finetune.config);

  const handleChange = (key: string, value: FinetuneConfigValue) => {
    dispatch(updateConfig({ [key]: value }));
  };

  const isDisabled = isTraining || isStarting || isStopping;

  return (
    <div className="glass-panel border border-border rounded-xl p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Конфигурация
        </h3>
        <button
          onClick={onToggleAdvanced}
          className="text-xs text-primary hover:underline"
        >
          {showAdvanced ? 'Скрыть дополнительные' : 'Показать все'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Основные настройки */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="finetune-model-name" className="block text-xs font-medium text-foreground/80 mb-1.5">
              Название новой модели
            </label>
            <input
              id="finetune-model-name"
              name="modelName"
              type="text"
              value={config.modelName}
              onChange={(e) => handleChange('modelName', e.target.value)}
              disabled={isDisabled}
              className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
              placeholder="my-fine-tuned-model"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="finetune-epochs" className="block text-xs font-medium text-foreground/80 mb-1.5">
              Эпохи
            </label>
            <input
              id="finetune-epochs"
              name="epochs"
              type="number"
              min="1"
              max="100"
              value={config.epochs}
              onChange={(e) => handleChange('epochs', parseInt(e.target.value) || 1)}
              disabled={isDisabled}
              className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="finetune-batch-size" className="block text-xs font-medium text-foreground/80 mb-1.5">
              Batch Size
            </label>
            <input
              id="finetune-batch-size"
              name="batchSize"
              type="number"
              min="1"
              max="32"
              value={config.batchSize}
              onChange={(e) => handleChange('batchSize', parseInt(e.target.value) || 1)}
              disabled={isDisabled}
              className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="finetune-learning-rate" className="block text-xs font-medium text-foreground/80 mb-1.5">
            Learning Rate
          </label>
          <input
            id="finetune-learning-rate"
            name="learningRate"
            type="number"
            step="0.00001"
            value={config.learningRate}
            onChange={(e) => handleChange('learningRate', parseFloat(e.target.value) || 0.0001)}
            disabled={isDisabled}
            className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 font-mono"
          />
        </div>

        {/* Дополнительные настройки */}
        {showAdvanced && (
          <div className="pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              LoRA Параметры
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="finetune-lora-rank" className="block text-xs font-medium text-foreground/80 mb-1.5">
                  LoRA Rank (r)
                </label>
                <select
                  id="finetune-lora-rank"
                  name="loraRank"
                  value={config.loraRank}
                  onChange={(e) => handleChange('loraRank', parseInt(e.target.value))}
                  disabled={isDisabled}
                  className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                >
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                  <option value="64">64</option>
                  <option value="128">128</option>
                </select>
              </div>
              <div>
                <label htmlFor="finetune-lora-alpha" className="block text-xs font-medium text-foreground/80 mb-1.5">
                  LoRA Alpha
                </label>
                <input
                  id="finetune-lora-alpha"
                  name="loraAlpha"
                  type="number"
                  value={config.loraAlpha}
                  onChange={(e) => handleChange('loraAlpha', parseInt(e.target.value))}
                  disabled={isDisabled}
                  className="w-full px-3 py-2 bg-background/50 dark:bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="finetune-flash-attention" className="text-xs text-foreground/80">Use Flash Attention 2</label>
                <input
                  id="finetune-flash-attention"
                  name="useFlashAttention"
                  type="checkbox"
                  checked={config.useFlashAttention}
                  onChange={(e) => handleChange('useFlashAttention', e.target.checked)}
                  disabled={isDisabled}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-ring/40 border-gray-300 dark:border-border dark:bg-muted"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="finetune-gradient-checkpointing" className="text-xs text-foreground/80">Gradient Checkpointing</label>
                <input
                  id="finetune-gradient-checkpointing"
                  name="useGradientCheckpointing"
                  type="checkbox"
                  checked={config.useGradientCheckpointing}
                  onChange={(e) => handleChange('useGradientCheckpointing', e.target.checked)}
                  disabled={isDisabled}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-ring/40 border-gray-300 dark:border-border dark:bg-muted"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Target Modules
                </label>
                <div className="flex flex-wrap gap-2">
                  {['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map((module) => (
                    <label key={module} htmlFor={`finetune-target-module-${module.replace(/_/g, '-')}`} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 dark:bg-muted px-2 py-1 rounded border border-border cursor-pointer">
                      <input
                        id={`finetune-target-module-${module.replace(/_/g, '-')}`}
                        name={`targetModule-${module}`}
                        type="checkbox"
                        checked={config.targetModules.includes(module)}
                        onChange={(e) => {
                          const newModules = e.target.checked
                            ? [...config.targetModules, module]
                            : config.targetModules.filter((m: string) => m !== module);
                          handleChange('targetModules', newModules);
                        }}
                        disabled={isDisabled}
                        className="w-3 h-3 text-blue-600 rounded focus:ring-ring/40 border-gray-300 dark:border-border dark:bg-muted"
                      />
                      {module}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPanel;