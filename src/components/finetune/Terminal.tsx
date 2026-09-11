// /home/user/projects/studioxlam/src/components/finetune/Terminal.tsx
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface TerminalProps {
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ logsEndRef }) => {
  const logs = useSelector((state: RootState) => state.finetune.logs);
  const autoScroll = useSelector((state: RootState) => state.finetune.autoScrollLogs);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, logsEndRef]);

  // Функция для раскраски логов (теперь с поддержкой обеих тем)
  const colorizeLog = (log: string) => {
    if (log.includes('[ERROR]') || log.toLowerCase().includes('error')) 
      return 'text-red-600 dark:text-red-400 font-bold';
    if (log.includes('[WARNING]') || log.toLowerCase().includes('warning')) 
      return 'text-amber-600 dark:text-amber-400';
    if (log.includes('[SUCCESS]') || log.toLowerCase().includes('success') || log.includes('✅')) 
      return 'text-emerald-600 dark:text-emerald-400';
    if (log.includes('[INFO]')) 
      return 'text-primary';
    if (log.includes('loss:')) 
      return 'text-purple-600 dark:text-purple-300';
    return 'text-gray-700 dark:text-muted-foreground';
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-xl border border-gray-200 dark:border-border shadow-inner overflow-hidden font-mono text-sm relative group">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-background border-b border-gray-200 dark:border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="text-xs text-gray-500 dark:text-muted-foreground ml-2">
            terminal — {logs.length} lines
          </span>
        </div>
      </div>
      
      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 custom-scrollbar bg-gray-50/50 dark:bg-transparent">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-muted-foreground gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Ожидание логов...</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`break-words whitespace-pre-wrap leading-relaxed ${colorizeLog(log)} text-xs md:text-sm`}>
              <span className="text-gray-400 dark:text-muted-foreground select-none mr-2">
                {(index + 1).toString().padStart(3, '0')}
              </span>
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
      
      {/* Overlay indicator for new logs if not auto-scrolling */}
      {!autoScroll && logs.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg cursor-pointer transition-colors">
          ↓ Новые сообщения
        </div>
      )}
    </div>
  );
};

export default Terminal;