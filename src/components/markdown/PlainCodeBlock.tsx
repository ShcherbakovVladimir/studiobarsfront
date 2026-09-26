import React, { useState } from 'react';

export const PlainCodeBlock: React.FC<{ code: string; isDarkMode: boolean }> = ({ code, isDarkMode }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-3 min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-muted hover:bg-accent text-foreground rounded-md text-xs shadow"
        title="Копировать"
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
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
