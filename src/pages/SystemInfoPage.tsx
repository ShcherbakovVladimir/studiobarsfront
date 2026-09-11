// /home/user/projects/studioxlam/src/pages/SystemInfoPage.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import SystemInfoPanel from '../components/SystemInfoPanel';
import type { RootState } from '../store/store';

const SystemInfoPage: React.FC = () => {
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
      <SystemInfoPanel isDarkMode={isDarkMode} />
    </div>
  );
};

export default SystemInfoPage;
