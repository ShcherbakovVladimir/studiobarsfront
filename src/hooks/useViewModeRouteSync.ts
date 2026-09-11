import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { setViewMode } from '../store/appSlice';
import { viewModeFromPath } from '../utils/viewModeRoutes';

/** Sync Redux viewMode with the current URL path. */
export function useViewModeRouteSync(): void {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const currentViewMode = useSelector((state: RootState) => state.app.viewMode);

  useEffect(() => {
    const mode = viewModeFromPath(location.pathname);
    if (mode && mode !== currentViewMode) {
      dispatch(setViewMode(mode));
    }
  }, [location.pathname, currentViewMode, dispatch]);
}
