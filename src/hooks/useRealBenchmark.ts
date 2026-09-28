import { useState, useEffect, useCallback, useRef } from 'react';
import {
  realBenchmarkService,
  type BenchmarkSnapshot,
  type BenchmarkStats,
  type GpuLiveRow,
  type InferenceHistoryPoint,
} from '../services/benchmarkService';
import { readInference, type InferenceSnapshot } from '../utils/inferenceSnapshot';

interface UseRealBenchmarkOptions {
  autoPoll?: boolean;
  pollingInterval?: number;
}

function isCancelledRequestError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    return message.includes('cancel') || message.includes('abort');
  }
  return false;
}

export const useRealBenchmark = (options: UseRealBenchmarkOptions = {}) => {
  const { autoPoll = true, pollingInterval = 5000 } = options;

  const [snapshot, setSnapshot] = useState<BenchmarkSnapshot | null>(null);
  const [gpus, setGpus] = useState<GpuLiveRow[]>([]);
  const [inference, setInference] = useState<InferenceSnapshot>(() => readInference({ available: false }));
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [history, setHistory] = useState<InferenceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(autoPoll);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const data = await realBenchmarkService.fetchRealBenchmarkData();
      if (!isMounted.current) return;

      setSnapshot(data);
      setGpus(data.gpus);
      setInference(data.inference);
      setStats(realBenchmarkService.getStats());
      setHistory(realBenchmarkService.getHistory());
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      if (isCancelledRequestError(err) || !isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      if (isMounted.current) setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const togglePolling = useCallback(() => {
    setIsPolling((prev) => !prev);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (isPolling && autoPoll) {
      pollingIntervalRef.current = setInterval(() => {
        if (!isFetchingRef.current) void fetchData();
      }, pollingInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, autoPoll, pollingInterval, fetchData]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      realBenchmarkService.cancelCurrentRequest();
    };
  }, []);

  const clearHistory = useCallback(() => {
    realBenchmarkService.clearHistory();
    setSnapshot(null);
    setGpus([]);
    setInference(readInference({ available: false }));
    setStats(realBenchmarkService.getStats());
    setHistory([]);
  }, []);

  return {
    snapshot,
    gpus,
    inference,
    stats,
    history,
    isLoading,
    isPolling,
    error,
    lastUpdate,
    fetchData,
    togglePolling,
    clearHistory,
  };
};
