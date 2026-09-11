// /home/user/projects/studioxlam/src/hooks/useHardwareStats.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import monitoringService, { type MonitoringFullData } from '../services/monitoringService';

type HardwareData = MonitoringFullData;

interface UseHardwareStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useHardwareStats = (options: UseHardwareStatsOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 15000, // 15 секунд по умолчанию
  } = options;

  const [data, setData] = useState<HardwareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Создаем новый AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSignal = signal || controller.signal;

    setIsLoading(true);
    setError(null);

    try {
      const result = await monitoringService.getFull(currentSignal);
      
      if (!result.success) {
        throw new Error('API returned unsuccessful response');
      }

      if (isMounted.current) {
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }));
      }
    } catch (err) {
      // Игнорируем ошибки отмены
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Запрос был отменен');
        return;
      }
      
      console.error('Error fetching hardware stats:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshing(prev => !prev);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
      // Отменяем запрос при размонтировании компонента
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setTimeout> | null = null;

    if (isAutoRefreshing) {
      intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshing, refreshInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isAutoRefreshing,
    refresh: () => fetchData(),
    toggleAutoRefresh,
  };
};