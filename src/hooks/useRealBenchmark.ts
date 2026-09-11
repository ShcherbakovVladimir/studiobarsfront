// /home/user/projects/studioxlam/src/hooks/useRealBenchmark.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { realBenchmarkService, BenchmarkResult, BenchmarkStats } from '../services/benchmarkService';

interface UseRealBenchmarkOptions {
  autoPoll?: boolean;
  pollingInterval?: number;
  deviceFilter?: string[];
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
  const {
    autoPoll = true,
    pollingInterval = 5000,
    deviceFilter = [],
  } = options;

  const [realData, setRealData] = useState<BenchmarkResult[]>([]);
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(autoPoll);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const data = await realBenchmarkService.fetchRealBenchmarkData();

      if (!isMounted.current) {
        return;
      }

      const filteredData = deviceFilter.length > 0
        ? data.filter(item => deviceFilter.includes(item.device))
        : data;

      setRealData(filteredData);
      setStats(realBenchmarkService.getStats());
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      if (isCancelledRequestError(err) || !isMounted.current) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      console.error('Error in fetchData:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [deviceFilter]);

  const togglePolling = useCallback(() => {
    setIsPolling(prev => !prev);
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
        if (!isFetchingRef.current) {
          void fetchData();
        }
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

  const getDeviceData = useCallback((deviceName: string) => {
    return realBenchmarkService.getDeviceData(deviceName);
  }, []);

  const clearHistory = useCallback(() => {
    realBenchmarkService.clearHistory();
    setStats(realBenchmarkService.getStats());
    setRealData([]);
  }, []);

  return {
    realData,
    stats,
    history: realBenchmarkService.getHistory(),
    latestData: realBenchmarkService.getLatestData(),
    isLoading,
    isPolling,
    error,
    lastUpdate,
    fetchData,
    togglePolling,
    clearHistory,
    getDeviceData,
  };
};
