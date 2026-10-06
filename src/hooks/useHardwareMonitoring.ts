// /home/user/projects/studioxlam/src/hooks/useHardwareMonitoring.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { realBenchmarkService, type MonitoringData } from '../services/benchmarkService';

interface UseHardwareMonitoringOptions {
  autoPoll?: boolean;
  pollingInterval?: number;
  enabled?: boolean;
}

export const useHardwareMonitoring = (options: UseHardwareMonitoringOptions = {}) => {
  const {
    autoPoll = true,
    pollingInterval = 30000, // 30 секунд
    enabled = true,
  } = options;

  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [completedSeq, setCompletedSeq] = useState(0);
  const [startedSeq, setStartedSeq] = useState(0);
  const [isPolling, setIsPolling] = useState(autoPoll);

  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const queuedRef = useRef(false);
  const seqRef = useRef(0);
  /** Одна и та же ошибка опроса пишется в консоль один раз, а не каждые 30 с. */
  const lastLoggedErrorRef = useRef('');
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    if (isFetchingRef.current) {
      queuedRef.current = true;
      return;
    }

    const seq = ++seqRef.current;
    isFetchingRef.current = true;
    setStartedSeq(seq);
    setIsLoading(true);
    setError(null);

    try {
      const result = await realBenchmarkService.fetchMonitoringData();
      
      if (!isMounted.current) return;
      
      lastLoggedErrorRef.current = '';
      setData(result);
      setCompletedSeq(seq);
      setLastUpdated(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : '';
      if (
        errorMessage.includes('cancelled') ||
        errorMessage.includes('aborted') ||
        errorMessage === 'Request cancelled'
      ) {
        return;
      }
      
      if (errorMessage !== lastLoggedErrorRef.current) {
        lastLoggedErrorRef.current = errorMessage;
        console.warn('GET /api/monitoring/full:', errorMessage);
      }
      if (isMounted.current) {
        setError(errorMessage || 'Неизвестная ошибка');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
      if (queuedRef.current && isMounted.current) {
        queuedRef.current = false;
        void fetchData();
      }
    }
  }, [enabled]);

  const togglePolling = useCallback(() => {
    setIsPolling(prev => !prev);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (isPolling && autoPoll && enabled) {
      pollingIntervalRef.current = setInterval(() => {
        if (!isFetchingRef.current) {
          fetchData();
        }
      }, pollingInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, autoPoll, pollingInterval, fetchData, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
  }, [fetchData, enabled]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    startedSeq,
    completedSeq,
    isPolling,
    refresh: fetchData,
    togglePolling,
  };
};