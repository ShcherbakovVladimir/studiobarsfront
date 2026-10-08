import { useCallback, useSyncExternalStore } from 'react';
import { getLiveRate, subscribeLiveRate } from '../utils/liveTokenRate';
import {
  getRagStreamDraft,
  getStreamDraft,
  subscribeRagStreamDraft,
  subscribeStreamDraft,
} from '../utils/streamDraft';

export function useLiveRate(): ReturnType<typeof getLiveRate> {
  return useSyncExternalStore(subscribeLiveRate, getLiveRate, getLiveRate);
}

function useTextDraft(
  active: boolean,
  subscribeDraft: (listener: () => void) => () => void,
  readDraft: () => string,
): string {
  const subscribe = useCallback(
    (listener: () => void) => (active ? subscribeDraft(listener) : () => undefined),
    [active, subscribeDraft],
  );
  const getSnapshot = useCallback(() => (active ? readDraft() : ''), [active, readDraft]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Подписка только у сообщения, которое сейчас пишется. Остальные кадры стрима не трогают. */
export function useStreamDraft(active: boolean): string {
  return useTextDraft(active, subscribeStreamDraft, getStreamDraft);
}

export function useRagStreamDraft(active: boolean): string {
  return useTextDraft(active, subscribeRagStreamDraft, getRagStreamDraft);
}
