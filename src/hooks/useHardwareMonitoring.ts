// /home/user/projects/studioxlam/src/hooks/useHardwareMonitoring.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { realBenchmarkService, MonitoringData } from '../services/benchmarkService';

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
  const [isPolling, setIsPolling] = useState(autoPoll);

  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await realBenchmarkService.fetchMonitoringData();
      
      if (!isMounted.current) return;
      
      setData(result);
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
      
      console.error('Error fetching hardware monitoring:', err);
      if (isMounted.current) {
        setError(errorMessage || 'Неизвестная ошибка');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
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
    isPolling,
    refresh: fetchData,
    togglePolling,
  };
};