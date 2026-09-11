import type { RuntimeConfig, UserSettings } from '../types';

let chatDefaults: RuntimeConfig['chatDefaults'] | null = null;
let ragDefaults: RuntimeConfig['ragDefaults'] | null = null;

export function applyChatDefaults(defaults: RuntimeConfig['chatDefaults']): void {
  chatDefaults = defaults;
}

export function applyRagDefaults(defaults: RuntimeConfig['ragDefaults']): void {
  ragDefaults = defaults;
}

export function applyUserSettings(settings: UserSettings | null | undefined): void {
  if (!settings) return;
  const chat = settings.chat;
  if (chat && typeof chat === 'object') {
    applyChatDefaults({
      ...(chatDefaults ?? {
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 4096,
      }),
      ...(chat as Partial<RuntimeConfig['chatDefaults']>),
    });
  }
  const rag = settings.rag;
  if (rag && typeof rag === 'object') {
    applyRagDefaults({
      ...(ragDefaults ?? {
        temperature: 0.7,
        topP: 0.9,
        limit: 10,
        relevanceScore: 0.5,
        systemPrompt: '',
        enableThinking: true,
        preserveThinking: true,
        qwenMode: 'auto',
      }),
      ...(rag as Partial<RuntimeConfig['ragDefaults']>),
    });
  }
}

export function getChatDefaults(): RuntimeConfig['chatDefaults'] | null {
  return chatDefaults;
}

export function getRagDefaults(): RuntimeConfig['ragDefaults'] | null {
  return ragDefaults;
}
