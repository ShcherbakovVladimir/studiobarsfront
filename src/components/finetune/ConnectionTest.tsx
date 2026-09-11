// /home/user/projects/studioxlam/src/components/finetune/ConnectionTest.tsx
import React from 'react';

interface ConnectionTestProps {
  isTraining: boolean;
  isStarting: boolean;
  isStopping: boolean;
  websocketConnected: boolean;
}

const ConnectionTest: React.FC<ConnectionTestProps> = ({
  isTraining,
  isStarting,
  isStopping,
  websocketConnected
}) => {
  // Only show if there's an active process or connection issue
  if (!isTraining && !isStarting && !isStopping && !websocketConnected) {
    return null;
  }

  const getStatusText = () => {
    if (isStarting) return 'Запуск...';
    if (isStopping) return 'Остановка...';
    if (isTraining) return 'Обучение активно';
    return 'Ожидание';
  };

  return (
    <div className={`
 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border mb-3
      ${websocketConnected 
        ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30' 
        : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30'}
`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${websocketConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
        <span>{websocketConnected ? 'WebSocket подключен' : 'Подключение к мониторингу...'}</span>
      </div>
      
      {(isTraining || isStarting || isStopping) && (
        <span className="px-2 py-0.5 surface-elevated rounded shadow-sm text-[10px]">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default ConnectionTest;