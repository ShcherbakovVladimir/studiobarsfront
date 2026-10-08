/** Усилие рассуждений Qwen 3.6/3.8. Сервер подставляет фразу шаблона GGUF, фронт ChatML не собирает. */
export const REASONING_EFFORTS = ['xhigh', 'medium', 'low', 'none'] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type QwenChatMode = 'auto' | 'thinking' | 'instruct' | 'coding';

export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  xhigh: 'Максимум',
  medium: 'Средне',
  low: 'Кратко',
  none: 'Выкл',
};

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  if (value === 'high' || value === 'xhigh') return 'xhigh';
  if (value === 'medium' || value === 'low' || value === 'none') return value;
  return 'xhigh';
}

/**
 * Поля Qwen для POST /api/chat. `none` и `instruct` выключают рассуждения.
 * В `thinking` и `coding` усилие меняет только фразу шаблона.
 */
export function qwenChatFields(options: {
  mode?: QwenChatMode;
  enableThinking?: boolean;
  preserveThinking?: boolean;
  reasoningEffort?: unknown;
}): {
  mode: QwenChatMode;
  enableThinking: boolean;
  preserveThinking: boolean;
  reasoningEffort: ReasoningEffort;
} {
  const mode = options.mode ?? 'auto';
  const reasoningEffort = normalizeReasoningEffort(options.reasoningEffort);
  let enableThinking = options.enableThinking !== false;
  if (mode === 'instruct') enableThinking = false;
  else if (mode === 'thinking' || mode === 'coding') enableThinking = true;
  else if (reasoningEffort === 'none') enableThinking = false;

  return {
    mode,
    enableThinking,
    preserveThinking: options.preserveThinking !== false,
    reasoningEffort,
  };
}
