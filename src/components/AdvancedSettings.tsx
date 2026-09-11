// /home/user/projects/studioxlam/src/components/AdvancedSettings.tsx
import React, { useState, useEffect } from 'react';

interface AdvancedSettingsState {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface AdvancedSettingsProps {
  isDarkMode: boolean;
  onSettingsChange: (settings: AdvancedSettingsState) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ isDarkMode, onSettingsChange }) => {
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  });

  useEffect(() => {
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleChange = (key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={``}>
      <div className="glass-panel border border-border rounded-xl p-5 mb-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Расширенные настройки генерации</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="adv-temperature" className="text-sm font-medium text-foreground/80">Temperature</label>
              <span className="text-xs font-mono bg-accent px-2 py-0.5 rounded">{settings.temperature}</span>
            </div>
            <input 
              id="adv-temperature"
              name="temperature"
              type="range" min="0" max="2" step="0.1"
              value={settings.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-1">Контролирует случайность вывода. Выше = креативнее.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="adv-max-tokens" className="text-sm font-medium text-foreground/80">Max Tokens</label>
              <input 
                id="adv-max-tokens"
                name="maxTokens"
                type="number" 
                value={settings.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                className="text-xs font-mono bg-accent px-2 py-0.5 rounded w-16 text-right border-none focus:ring-1 focus:ring-ring/40"
              />
            </div>
            <input 
              id="adv-max-tokens-range"
              name="maxTokensRange"
              type="range" min="64" max="8192" step="64"
              value={settings.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
              aria-label="Max Tokens"
            />
            <p className="text-xs text-muted-foreground mt-1">Максимальное количество токенов в ответе.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="adv-top-p" className="text-sm font-medium text-foreground/80">Top P</label>
              <span className="text-xs font-mono bg-accent px-2 py-0.5 rounded">{settings.topP}</span>
            </div>
            <input 
              id="adv-top-p"
              name="topP"
              type="range" min="0" max="1" step="0.05"
              value={settings.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-1">Nucleus sampling. Учитывает токены с суммарной вероятностью P.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="adv-top-k" className="text-sm font-medium text-foreground/80">Top K</label>
              <span className="text-xs font-mono bg-accent px-2 py-0.5 rounded">{settings.topK}</span>
            </div>
            <input 
              id="adv-top-k"
              name="topK"
              type="range" min="0" max="100" step="1"
              value={settings.topK}
              onChange={(e) => handleChange('topK', parseInt(e.target.value))}
              className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-1">Ограничивает выборку K наиболее вероятными токенами.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="adv-repeat-penalty" className="text-sm font-medium text-foreground/80">Repeat Penalty</label>
              <span className="text-xs font-mono bg-accent px-2 py-0.5 rounded">{settings.repeatPenalty}</span>
            </div>
            <input 
              id="adv-repeat-penalty"
              name="repeatPenalty"
              type="range" min="1" max="2" step="0.05"
              value={settings.repeatPenalty}
              onChange={(e) => handleChange('repeatPenalty', parseFloat(e.target.value))}
              className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-muted-foreground mt-1">Штраф за повторение токенов.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
