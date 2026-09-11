import React from 'react';
import MarkdownContent from './MarkdownContent';
import { splitThinkingContent } from '../utils/thinkingContent';

interface ThinkingAwareContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  answerClassName?: string;
  markdown?: boolean;
  isDarkMode?: boolean;
}

const ThinkingAwareContent: React.FC<ThinkingAwareContentProps> = ({
  content,
  isStreaming = false,
  className = '',
  answerClassName = 'whitespace-pre-wrap break-words leading-relaxed',
  markdown = false,
  isDarkMode = false,
}) => {
  const { thinking, answer, hasThinkingBlock, isThinkingComplete } = splitThinkingContent(content);
  const showAnswerStreaming = isStreaming && (isThinkingComplete || !hasThinkingBlock);

  if (!content.trim()) {
    return (
      <span className="text-muted-foreground italic">
        {isStreaming ? 'Ожидание первого токена...' : 'Пустой ответ'}
        {isStreaming && <span className="inline-block ml-1 animate-pulse">▊</span>}
      </span>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {hasThinkingBlock && thinking && (
        <details open={isStreaming && !isThinkingComplete} className="text-sm group">
          <summary className="cursor-pointer list-none flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
            <span className="text-base">🧠</span>
            <span>Размышление</span>
            {isStreaming && !isThinkingComplete && (
              <span className="text-xs text-purple-500 animate-pulse">пишется...</span>
            )}
          </summary>
          <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg text-purple-900 dark:text-purple-100 text-sm italic whitespace-pre-wrap leading-relaxed">
            {thinking}
            {isStreaming && !isThinkingComplete && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-purple-500 animate-pulse align-middle" />
            )}
          </div>
        </details>
      )}

      {answer ? (
        markdown ? (
          <MarkdownContent
            content={answer}
            isDarkMode={isDarkMode}
            isStreaming={showAnswerStreaming}
            className={answerClassName}
          />
        ) : (
          <div className={answerClassName}>
            {answer}
            {showAnswerStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-blue-500 animate-pulse align-middle" />
            )}
          </div>
        )
      ) : (
        isStreaming &&
        hasThinkingBlock &&
        !isThinkingComplete && (
          <p className="text-xs text-muted-foreground italic">Ответ появится после размышления...</p>
        )
      )}
    </div>
  );
};

export default ThinkingAwareContent;
