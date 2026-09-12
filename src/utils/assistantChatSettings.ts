import type { UserSettings } from '../types';

export type AssistantQwenMode = 'auto' | 'thinking' | 'instruct' | 'coding';

export interface ChatUserSettings {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean;
  mode?: AssistantQwenMode;
  use_tools?: boolean;
  useTools?: boolean;
  selectedTools?: string[];
  requireTools?: boolean;
}

const TOOLS_STORAGE_KEY = 'xlam-assistant-tools-v1';

export function readChatUserSettings(settings: UserSettings | null | undefined): ChatUserSettings {
  const raw = settings?.chat;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const chat = raw as Record<string, unknown>;
  const mode = chat.mode;
  return {
    systemPrompt: typeof chat.systemPrompt === 'string' ? chat.systemPrompt : undefined,
    temperature: typeof chat.temperature === 'number' ? chat.temperature : undefined,
    maxTokens: typeof chat.maxTokens === 'number' ? chat.maxTokens : undefined,
    enableThinking: typeof chat.enableThinking === 'boolean' ? chat.enableThinking : undefined,
    mode:
      mode === 'auto' || mode === 'thinking' || mode === 'instruct' || mode === 'coding'
        ? mode
        : undefined,
    use_tools: typeof chat.use_tools === 'boolean' ? chat.use_tools : undefined,
    useTools: typeof chat.useTools === 'boolean' ? chat.useTools : undefined,
    selectedTools: Array.isArray(chat.selectedTools)
      ? chat.selectedTools.filter((name): name is string => typeof name === 'string')
      : undefined,
    requireTools: typeof chat.requireTools === 'boolean' ? chat.requireTools : undefined,
  };
}

export function toolsEnabledFromSettings(chat: ChatUserSettings): boolean | undefined {
  if (typeof chat.use_tools === 'boolean') return chat.use_tools;
  if (typeof chat.useTools === 'boolean') return chat.useTools;
  return undefined;
}

export function loadLocalToolPrefs(): { selectedTools?: string[]; requireTools?: boolean } {
  try {
    const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { selectedTools?: unknown; requireTools?: unknown };
    return {
      selectedTools: Array.isArray(parsed.selectedTools)
        ? parsed.selectedTools.filter((name): name is string => typeof name === 'string')
        : undefined,
      requireTools: typeof parsed.requireTools === 'boolean' ? parsed.requireTools : undefined,
    };
  } catch {
    return {};
  }
}

export function saveLocalToolPrefs(selectedTools: string[], requireTools: boolean): void {
  try {
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify({ selectedTools, requireTools }));
  } catch {
    // ignore quota / private mode
  }
}

export function mergeChatSettings(
  current: UserSettings | null | undefined,
  patch: ChatUserSettings
): UserSettings {
  const prev = readChatUserSettings(current);
  return {
    ...(current ?? {}),
    chat: {
      ...prev,
      ...patch,
      use_tools: patch.use_tools ?? patch.useTools ?? prev.use_tools ?? prev.useTools ?? false,
      useTools: patch.useTools ?? patch.use_tools ?? prev.useTools ?? prev.use_tools ?? false,
    },
  };
}
