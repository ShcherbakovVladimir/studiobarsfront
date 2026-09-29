import React from 'react';
import { CodeCopyButton } from './CodeCopyButton';

export const PlainCodeBlock: React.FC<{ code: string; isDarkMode: boolean }> = ({ code, isDarkMode }) => {
  return (
    <div className="relative group my-3 min-w-0 max-w-full">
      <CodeCopyButton code={code} />
      <pre
        className="overflow-x-auto rounded-lg border px-3 py-2.5 text-[13px] leading-snug font-mono whitespace-pre"
        style={{
          backgroundColor: isDarkMode ? '#1e1e1e' : '#f6f8fa',
          color: isDarkMode ? '#d4d4d4' : '#24292e',
          borderColor: isDarkMode ? '#3e3e3e' : '#e1e4e8',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};
