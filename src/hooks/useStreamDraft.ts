import { useCallback, useSyncExternalStore } from 'react';
import { getLiveRate, subscribeLiveRate } from '../utils/liveTokenRate';
import { getStreamDraft, subscribeStreamDraft } from '../utils/streamDraft';

export function useLiveRate(): ReturnType<typeof getLiveRate> {
  return useSyncExternalStore(subscribeLiveRate, getLiveRate, getLiveRate);
}

/** Подписка только у сообщения, которое сейчас пишется. Остальные кадры стрима не трогают. */
export function useStreamDraft(active: boolean): string {
  const subscribe = useCallback(
    (listener: () => void) => (active ? subscribeStreamDraft(listener) : () => undefined),
    [active],
  );
  const getSnapshot = useCallback(() => (active ? getStreamDraft() : ''), [active]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
