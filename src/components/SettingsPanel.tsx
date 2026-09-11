// /home/user/projects/studioxlam/src/components/SettingsPanel.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import type { ChatState } from '../types';
import { updateSettings } from '../store/chatSlice';

export interface SettingsPanelProps {
  compact?: boolean;
}

// Тип для настроек с необязательными полями
interface ChatSettings {
  temperature: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

type ExtendedChatSettings = ChatState['settings'] & {
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ compact = false }) => {
  const settings = useSelector((state: RootState) => state.chat.settings) as ExtendedChatSettings;
  const dispatch = useDispatch();

  if (!settings) return null;

  // Безопасный доступ к свойствам с значениями по умолчанию
  const safeSettings: ChatSettings = {
    temperature: settings.temperature,
    maxTokens: settings.maxTokens || 2048,
    topP: settings.topP ?? 0.9,
    topK: settings.topK ?? 40,
    repeatPenalty: settings.repeatPenalty ?? 1.1,
    frequencyPenalty: settings.frequencyPenalty ?? 0.0,
    presencePenalty: settings.presencePenalty ?? 0.0
  };

  if (compact) {
    return (
      <div className="bg-background/50 dark:bg-muted/50 rounded-xl p-3 border border-border/50">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Параметры</h4>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="settings-temperature" className="text-xs text-foreground/80">Temperature</label>
              <span className="text-xs font-mono bg-border dark:bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {safeSettings.temperature}
              </span>
            </div>
            <input 
              id="settings-temperature"
              name="temperature"
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              value={safeSettings.temperature}
              onChange={(e) => dispatch(updateSettings({ temperature: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="settings-max-tokens" className="text-xs text-foreground/80">Max Tokens</label>
              <span className="text-xs font-mono bg-border dark:bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {safeSettings.maxTokens}
              </span>
            </div>
            <input 
              id="settings-max-tokens"
              name="maxTokens"
              type="range" 
              min="128" 
              max="8192" 
              step="128"
              value={safeSettings.maxTokens}
              onChange={(e) => dispatch(updateSettings({ maxTokens: parseInt(e.target.value) }))}
              className="w-full h-1.5 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/50 dark:bg-muted/50 rounded-xl p-4 border border-border/50">
      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Параметры генерации</h4>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="settings-temperature" className="text-sm text-foreground/80">Temperature</label>
            <span className="text-xs font-mono bg-border dark:bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {safeSettings.temperature}
            </span>
          </div>
          <input 
            id="settings-temperature"
            name="temperature"
            type="range" 
            min="0" 
            max="1" 
            step="0.1"
            value={safeSettings.temperature}
            onChange={(e) => dispatch(updateSettings({ temperature: parseFloat(e.target.value) }))}
            className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Низкая: точнее / Высокая: креативнее
          </p>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="settings-max-tokens" className="text-sm text-foreground/80">Max Tokens</label>
            <span className="text-xs font-mono bg-border dark:bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {safeSettings.maxTokens}
            </span>
          </div>
          <input 
            id="settings-max-tokens"
            name="maxTokens"
            type="range" 
            min="128" 
            max="8192" 
            step="128"
            value={safeSettings.maxTokens}
            onChange={(e) => dispatch(updateSettings({ maxTokens: parseInt(e.target.value) }))}
            className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Максимальное количество токенов в ответе
          </p>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="settings-top-p" className="text-sm text-foreground/80">Top P</label>
            <span className="text-xs font-mono bg-border dark:bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {safeSettings.topP}
            </span>
          </div>
          <input 
            id="settings-top-p"
            name="topP"
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            value={safeSettings.topP}
            onChange={(e) => dispatch(updateSettings({ topP: parseFloat(e.target.value) }))}
            className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Выборка из топ вероятностей (1 = отключено)
          </p>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="settings-repeat-penalty" className="text-sm text-foreground/80">Repeat Penalty</label>
            <span className="text-xs font-mono bg-border dark:bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {safeSettings.repeatPenalty}
            </span>
          </div>
          <input 
            id="settings-repeat-penalty"
            name="repeatPenalty"
            type="range" 
            min="1" 
            max="2" 
            step="0.1"
            value={safeSettings.repeatPenalty}
            onChange={(e) => dispatch(updateSettings({ repeatPenalty: parseFloat(e.target.value) }))}
            className="w-full h-2 bg-border dark:bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Штраф за повторение токенов (1 = нет штрафа)
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;