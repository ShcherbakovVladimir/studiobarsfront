import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import {
  deleteInferenceLabRequest,
  fetchInferenceLabAnalytics,
  fetchInferenceLabRequest,
  fetchInferenceLabRequests,
} from '../../store/inferenceLabSlice';
import { AdminWorkspace, adminBtnGhost } from './adminUi';
import { fieldInputClass } from '../../components/ui/menu-popover';
import InferenceHistoryPanel from '../../components/inference-lab/InferenceHistoryPanel';
import InferenceAnalyticsPanel from '../../components/inference-lab/InferenceAnalyticsPanel';
import type { InferenceLabListParams } from '../../services/inferenceLabService';
import { cn } from '../../lib/utils';

const AdminInferenceLabPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const lab = useSelector((state: RootState) => state.inferenceLab);
  const [tab, setTab] = useState<'history' | 'analytics'>('analytics');
  const [days, setDays] = useState(30);
  const [userId, setUserId] = useState('');
  const [filters, setFilters] = useState<InferenceLabListParams>({ page: 1, limit: 50 });

  useEffect(() => {
    if (tab === 'history') {
      void dispatch(
        fetchInferenceLabRequests({
          params: { ...filters, userId: userId || undefined },
          admin: true,
        })
      );
    } else {
      void dispatch(
        fetchInferenceLabAnalytics({ days, userId: userId || undefined, admin: true })
      );
    }
  }, [dispatch, tab, days, userId, filters]);

  return (
    <AdminWorkspace
      title="Инференс"
      description="Прогоны и аналитика"
      actions={
        <div className="flex items-center bg-accent rounded-xl p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setTab('analytics')}
            className={cn(
              'px-2.5 h-7 rounded-lg text-xs transition-colors',
              tab === 'analytics' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Аналитика
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={cn(
              'px-2.5 h-7 rounded-lg text-xs transition-colors',
              tab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Прогоны
          </button>
        </div>
      }
    >
      {tab === 'analytics' ? (
        <InferenceAnalyticsPanel
          analytics={lab.analytics}
          loading={lab.analyticsLoading}
          error={lab.analyticsError}
          days={days}
          onDaysChange={setDays}
          isDarkMode={isDarkMode}
          userFilter={userId}
          onUserFilterChange={setUserId}
        />
      ) : (
        <div className="space-y-3 min-w-0">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="userId"
              className={cn(fieldInputClass, 'w-full sm:w-56')}
            />
            <button type="submit" className={adminBtnGhost}>
              Фильтр
            </button>
          </form>
          <InferenceHistoryPanel
            items={lab.requests.items}
            total={lab.requests.total}
            page={lab.requests.page}
            limit={lab.requests.limit}
            loading={lab.historyLoading}
            error={lab.historyError}
            selectedId={lab.selected?.id}
            onSelect={(id) => void dispatch(fetchInferenceLabRequest(id))}
            onDelete={(id) => void dispatch(deleteInferenceLabRequest(id))}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next, page: 1 }))}
          />
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminInferenceLabPage;
