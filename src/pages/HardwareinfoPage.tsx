import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import BenchmarkingView from '../components/BenchmarkingView';
import { HardwareMonitor } from '../components/HardwareMonitor';
import type { RootState } from '../store/store';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';

type HardwareTab = 'monitoring' | 'benchmark';

const HardwareinfoPage: React.FC = () => {
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const [tab, setTab] = useState<HardwareTab>('monitoring');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <header className={celestia.appHeader}>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 text-sm font-semibold text-foreground">Мониторинг</h2>
            <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
            <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">
              {tab === 'monitoring' ? 'Оборудование' : 'Бенчмарк GPU'}
            </span>
          </div>

          <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit">
            <button
              type="button"
              aria-pressed={tab === 'monitoring'}
              onClick={() => setTab('monitoring')}
              className={cn(
                'px-2.5 h-7 rounded-lg text-xs transition-colors',
                tab === 'monitoring'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-border/80'
              )}
            >
              Мониторинг
            </button>
            <button
              type="button"
              aria-pressed={tab === 'benchmark'}
              onClick={() => setTab('benchmark')}
              className={cn(
                'px-2.5 h-7 rounded-lg text-xs transition-colors',
                tab === 'benchmark'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-border/80'
              )}
            >
              Бенчмарк
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {tab === 'monitoring' ? (
          <HardwareMonitor embedded />
        ) : (
          <BenchmarkingView isDarkMode={isDarkMode} embedded />
        )}
      </div>
    </div>
  );
};

export default HardwareinfoPage;
