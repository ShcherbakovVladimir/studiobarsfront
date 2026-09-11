// Qwen закрывает блок через ``, а не `</think>`.
const THINKING_CLOSE_TAG = '(?:<\\/redacted_thinking>|<\\/think>)';
const THINKING_BLOCK_RE = new RegExp(`<think>([\\s\\S]*?)${THINKING_CLOSE_TAG}`, 'i');
const THINKING_OPEN_RE = /<think>([\s\S]*)$/i;
const THINKING_STRIP_RE = new RegExp(`<think>[\\s\\S]*?${THINKING_CLOSE_TAG}`, 'gi');
const THINKING_OPEN_STRIP_RE = /<think>[\s\S]*$/i;

export interface SplitThinkingResult {
  thinking: string | null;
  answer: string;
  hasThinkingBlock: boolean;
  isThinkingComplete: boolean;
}

export function splitThinkingContent(text: string): SplitThinkingResult {
  if (!text) {
    return { thinking: null, answer: '', hasThinkingBlock: false, isThinkingComplete: false };
  }

  const closedMatch = text.match(THINKING_BLOCK_RE);
  if (closedMatch) {
    const thinking = closedMatch[1]?.trim() ?? null;
    const answer = text.replace(THINKING_STRIP_RE, '').trim();
    return {
      thinking: thinking || null,
      answer,
      hasThinkingBlock: Boolean(thinking),
      isThinkingComplete: true,
    };
  }

  const openMatch = text.match(THINKING_OPEN_RE);
  if (openMatch) {
    const thinking = openMatch[1]?.trim() ?? null;
    const answer = text.replace(THINKING_OPEN_STRIP_RE, '').trim();
    return {
      thinking: thinking || null,
      answer,
      hasThinkingBlock: true,
      isThinkingComplete: false,
    };
  }

  return {
    thinking: null,
    answer: text,
    hasThinkingBlock: false,
    isThinkingComplete: false,
  };
}

export function stripThinkingTags(text: string): string {
  return text
    .replace(THINKING_STRIP_RE, '')
    .replace(THINKING_OPEN_STRIP_RE, '')
    .replace(new RegExp(`<think>\\s*${THINKING_CLOSE_TAG}`, 'gi'), '')
    .trim();
}
