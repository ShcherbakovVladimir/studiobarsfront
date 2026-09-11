import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { prefetchChatList } from '../store/chatListSlice';
import { bootstrapRAG } from '../store/ragSlice';
import { chatSyncService } from '../services/chatSyncService';
import { applyUserSettings } from '../config/runtimeConfig';

/** Post-login data prefetch per backend integration spec */
export function usePostLoginBootstrap(): void {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const settings = useSelector((state: RootState) => state.auth.settings);

  useEffect(() => {
    if (!isAuthenticated) return;
    applyUserSettings(settings);
    chatSyncService.setChatSyncUserId(userId ?? null);
    chatSyncService.cleanupLegacyStorage();
    void dispatch(prefetchChatList(false));
    void dispatch(bootstrapRAG(userId));
  }, [dispatch, isAuthenticated, userId, settings]);
}
