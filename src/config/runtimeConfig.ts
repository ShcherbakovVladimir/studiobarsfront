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
        temperature: 1.0,
        maxTokens: 16384,
      }),
      ...(chat as Partial<RuntimeConfig['chatDefaults']>),
      useTools:
        (chat as { use_tools?: boolean; useTools?: boolean }).use_tools ??
        (chat as { useTools?: boolean }).useTools ??
        chatDefaults?.useTools,
    });
  }
  const rag = settings.rag;
  if (rag && typeof rag === 'object') {
    applyRagDefaults({
      ...(ragDefaults ?? {
        temperature: 1.0,
        topP: 0.9,
        limit: 10,
        relevanceScore: 0.45,
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
