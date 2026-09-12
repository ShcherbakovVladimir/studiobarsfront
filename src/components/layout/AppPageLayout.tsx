import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../Sidebar';
import type { AppDispatch, RootState } from '../../store/store';
import { updateHardwareStats } from '../../store/appSlice';
import { useHardwareMonitoring } from '../../hooks/useHardwareMonitoring';
import { usePostLoginBootstrap } from '../../hooks/usePostLoginBootstrap';
import { aggregateGpuMetrics, toGpuHardwareSnapshots } from '../../utils/gpuUtils';
import { isEmployee } from '../../utils/auth';
import { isFillAppPath } from '../../utils/viewModeRoutes';
import { cn } from '../../lib/utils';
import CelestiaBackground from './CelestiaBackground';
import { celestia } from '../../lib/celestia';
import { StudioLogo } from '../brand/StudioLogo';
import { APP_NAME } from '../../constants/brand';

interface AppPageLayoutProps {
  children?: React.ReactNode;
  mainClassName?: string;
}

const AppPageLayout: React.FC<AppPageLayoutProps> = ({
  children,
  mainClassName,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  usePostLoginBootstrap();

  const { data: hardwareData } = useHardwareMonitoring({
    autoPoll: true,
    pollingInterval: 30000,
    enabled: !isEmployee(user),
  });

  useEffect(() => {
    if (!hardwareData?.system) return;
    const gpuAgg = aggregateGpuMetrics(hardwareData.gpu);
    dispatch(updateHardwareStats({
      cpu: hardwareData.system.cpuUsage || 0,
      gpu: gpuAgg.maxUtilization,
      gpus: toGpuHardwareSnapshots(hardwareData.gpu),
      memory: hardwareData.system.memoryUsage || 0,
      temperature: gpuAgg.maxTemperature,
      gpuMemory: gpuAgg.totalUsedMb,
      disk: hardwareData.system.diskUsage || 0,
    }));
  }, [hardwareData, dispatch]);

  const fill = isFillAppPath(location.pathname);

  return (
    <div className={cn(celestia.page, 'relative transition-colors duration-300')}>
      <CelestiaBackground />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className={cn(
          'min-w-0 md:pl-64 relative page-enter',
          fill ? 'h-dvh overflow-hidden flex flex-col' : 'min-h-dvh'
        )}
      >
        <header className={cn('md:hidden sticky top-0 z-30', celestia.mobileHeader, celestia.appHeaderBar)}>
          <div className="flex items-center gap-2 w-full min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-xl transition-colors"
              aria-label="Открыть меню"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <StudioLogo className="h-7 w-7" />
            <span className="text-sm font-semibold truncate text-foreground">
              {APP_NAME}
            </span>
          </div>
        </header>

        <main
          className={cn(
            'min-w-0',
            fill
              ? 'flex-1 min-h-0 overflow-hidden p-0'
              : 'overflow-x-hidden p-4 sm:p-6 lg:p-8',
            mainClassName
          )}
        >
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppPageLayout;
