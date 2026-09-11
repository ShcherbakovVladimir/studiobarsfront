import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import {
  getScrollKey,
  setPanelActiveTab,
  setPanelToggle,
  setScrollPosition,
  togglePanelToggle,
  type PanelUiState,
} from '../store/workspaceUiSlice';

export function useWorkspacePanel(panelId: string, defaultTab = 'default') {
  const dispatch = useDispatch<AppDispatch>();
  const panel = useSelector(
    (state: RootState) =>
      state.workspaceUi.panels[panelId] ?? {
        activeTab: defaultTab,
        toggles: {},
      }
  );
  const scrollPositions = useSelector((state: RootState) => state.workspaceUi.scrollPositions);

  const setActiveTab = useCallback(
    (tab: string) => {
      dispatch(setPanelActiveTab({ panelId, tab }));
    },
    [dispatch, panelId]
  );

  const setToggle = useCallback(
    (key: string, value: boolean) => {
      dispatch(setPanelToggle({ panelId, key, value }));
    },
    [dispatch, panelId]
  );

  const toggle = useCallback(
    (key: string) => {
      dispatch(togglePanelToggle({ panelId, key }));
    },
    [dispatch, panelId]
  );

  const getToggle = useCallback(
    (key: string, fallback = false) => panel.toggles[key] ?? fallback,
    [panel.toggles]
  );

  return {
    activeTab: panel.activeTab,
    toggles: panel.toggles,
    scrollPositions,
    setActiveTab,
    setToggle,
    toggle,
    getToggle,
  };
}

export function usePanelScroll(
  panelId: string,
  tab: string,
  options?: { restore?: boolean }
) {
  const dispatch = useDispatch<AppDispatch>();
  const restore = options?.restore ?? true;
  const scrollKey = getScrollKey(panelId, tab);
  const savedScrollTop = useSelector(
    (state: RootState) => state.workspaceUi.scrollPositions[scrollKey] ?? 0
  );
  const savedScrollTopRef = useRef(savedScrollTop);
  savedScrollTopRef.current = savedScrollTop;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore once per panel/tab. Re-applying on every persisted scrollTop
  // fights live auto-scroll (chat open, streaming) and jumps to a stale offset.
  useLayoutEffect(() => {
    if (!restore) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = savedScrollTopRef.current;
  }, [restore, scrollKey]);

  useEffect(() => {
    if (!restore) return;
    const element = scrollRef.current;
    if (!element) return;

    // Streaming scrolls this container on every chunk; storing each event would
    // re-render the whole panel and force a layout per token.
    let timeoutId: number | null = null;
    const onScroll = () => {
      if (timeoutId !== null) return;
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        dispatch(setScrollPosition({ key: scrollKey, scrollTop: element.scrollTop }));
      }, 250);
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [dispatch, restore, scrollKey]);

  return scrollRef;
}

export function selectPanelState(panelId: string) {
  return (state: RootState): PanelUiState =>
    state.workspaceUi.panels[panelId] ?? {
      activeTab: 'default',
      toggles: {},
    };
}
