// /home/user/projects/studioxlam/src/components/finetune/SystemStats.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface SystemStatsProps {
  isMobile?: boolean;
}

const SystemStats: React.FC<SystemStatsProps> = () => {
  const systemStats = useSelector((state: RootState) => state.finetune.systemStats);

  // Helper to determine color based on usage
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-blue-500';
    if (percentage < 80) return 'bg-purple-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Системные ресурсы
      </h4>
      <div className="flex-1 space-y-4">
        {/* CPU */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground/80 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              CPU
            </span>
            <span className="font-mono text-muted-foreground">{systemStats.cpuUsage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(systemStats.cpuUsage)}`}
              style={{ width: `${Math.min(systemStats.cpuUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* RAM */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground/80 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              RAM
            </span>
            <span className="font-mono text-muted-foreground">{systemStats.memoryUsage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getUsageColor(systemStats.memoryUsage)}`}
              style={{ width: `${Math.min(systemStats.memoryUsage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Disk */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-foreground/80 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Диск
            </span>
            <span className="font-mono text-muted-foreground">{systemStats.diskUsage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full bg-border dark:bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 bg-violet-500"
              style={{ width: `${Math.min(systemStats.diskUsage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;