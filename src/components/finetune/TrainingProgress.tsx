// /home/user/projects/studioxlam/src/components/finetune/TrainingProgress.tsx
import React from 'react';
import { FinetuneSession, TrainingMetrics } from '../../types';

interface TrainingProgressProps {
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  metrics: TrainingMetrics;
  currentSession: FinetuneSession;
  isMobile?: boolean;
}

const TrainingProgress: React.FC<TrainingProgressProps> = ({
  progress,
  currentEpoch,
  totalEpochs,
  currentStep,
  totalSteps,
  metrics,
  currentSession,
}) => {
  // Format numbers for display - ИСПРАВЛЕНО
  const formatNumber = (num: number | undefined | null, decimals = 4) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.0000';
    }
    return num.toFixed(decimals);
  };

  // Format speed - добавил отдельную функцию для скорости
  const formatSpeed = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  };

  // Determine status color
  const getStatusColor = () => {
    switch (currentSession?.status) {
      case 'running': return 'bg-emerald-500';
      case 'completed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'stopped': return 'bg-amber-500';
      default: return 'bg-muted-foreground/40';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (currentSession?.status) {
      case 'running': return 'Обучение';
      case 'completed': return 'Завершено';
      case 'failed': return 'Ошибка';
      case 'stopped': return 'Остановлено';
      default: return 'Ожидание';
    }
  };

  return (
    <div className="glass-panel border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${currentSession?.status === 'running' ? 'animate-pulse' : ''}`}></div>
          {getStatusText()}
        </h3>
        <span className="text-xs font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded">
          {progress?.toFixed(1) || '0.0'}%
        </span>
      </div>

      <div className="h-2 w-full bg-accent rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${Math.min(progress || 0, 100)}%` }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 bg-background/50 dark:bg-muted/50 rounded-lg border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Эпоха</div>
          <div className="text-sm font-bold text-foreground">
            {currentEpoch || 0} <span className="text-muted-foreground font-normal">/ {totalEpochs || 1}</span>
          </div>
        </div>
        <div className="p-2 bg-background/50 dark:bg-muted/50 rounded-lg border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Шаги</div>
          <div className="text-sm font-bold text-foreground">
            {currentStep || 0} <span className="text-muted-foreground font-normal">/ {totalSteps > 0 ? totalSteps : '?'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30">
          <div className="text-[9px] text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5">Loss</div>
          <div className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
            {formatNumber(metrics?.loss)}
          </div>
        </div>
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
          <div className="text-[9px] text-primary uppercase tracking-wider mb-0.5">LR</div>
          <div className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
            {formatNumber(metrics?.learningRate, 6)}
          </div>
        </div>
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Speed</div>
          <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
            {formatSpeed(metrics?.samplesPerSecond)} s/it
          </div>
        </div>
      </div>

      {/* Добавил отображение статуса конвертации если есть */}
      {currentSession?.conversionStatus && currentSession.conversionStatus !== 'pending' && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          Конвертация адаптера: {
            currentSession.conversionStatus === 'success' ? '✅ Готов' :
            currentSession.conversionStatus === 'in_progress' ? '🔄 В процессе' :
            currentSession.conversionStatus === 'failed' ? '❌ Ошибка' :
            currentSession.conversionStatus
          }
        </div>
      )}
    </div>
  );
};

export default TrainingProgress;