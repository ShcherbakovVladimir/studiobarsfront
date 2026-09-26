import { useEffect, useRef, useState } from 'react';

/** Значение обновляется не чаще раза в `intervalMs`; последнее изменение всегда доходит. */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const wait = Math.max(0, intervalMs - (Date.now() - lastUpdateRef.current));
    const timer = window.setTimeout(() => {
      lastUpdateRef.current = Date.now();
      setThrottled(value);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [value, intervalMs]);

  return throttled;
}
