import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { updateHealth } from '../store/appSlice';
import { setMaintenance } from '../store/authSlice';
import { checkApiHealth, checkModelReady, deriveModelState } from '../services/healthService';
import adminService from '../services/adminService';
import { isAdmin } from '../utils/auth';

/** Фон — 30 с; пока модель не готова или API лежит — 10 с (FRONTEND_SERVER_MODEL_CONTROL §3.2). */
const BACKGROUND_MS = 30_000;
const ATTENTION_MS = 10_000;

export function useServiceHealthPolling(): () => Promise<void> {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const modelOperation = useSelector((state: RootState) => state.app.health.modelOperation);
  const maintenanceEnabled = useSelector((state: RootState) => Boolean(state.auth.maintenance?.enabled));
  const admin = useSelector((state: RootState) => isAdmin(state.auth.user));
  const operationRef = useRef(modelOperation);
  const maintenanceRef = useRef(maintenanceEnabled);
  const adminRef = useRef(admin);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  operationRef.current = modelOperation;
  maintenanceRef.current = maintenanceEnabled;
  adminRef.current = admin;

  const check = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return true;
    inFlightRef.current = true;
    try {
      const api = await checkApiHealth();
      if (api.api === 'offline') {
        dispatch(updateHealth({ api: 'offline', lastError: api.error, checkedAt: new Date().toISOString() }));
        return false;
      }
      const ready = await checkModelReady();
      if (ready.maintenance) {
        dispatch(updateHealth({ api: 'maintenance', checkedAt: new Date().toISOString() }));
        return false;
      }
      if (maintenanceRef.current) dispatch(setMaintenance(null));
      const model = deriveModelState(ready, operationRef.current !== null);
      dispatch(
        updateHealth({
          api: 'online',
          apiUptime: api.uptime,
          model,
          activeModel: ready.activeModel,
          llamaServerHealthy: ready.llamaServerHealthy,
          lastError: ready.error,
          checkedAt: new Date().toISOString(),
        })
      );
      if (adminRef.current) {
        const res = await adminService.getMaintenance().catch(() => null);
        if (res?.maintenance) {
          dispatch(updateHealth({
            adminMaintenance: { enabled: Boolean(res.maintenance.enabled), message: res.maintenance.message ?? undefined },
          }));
        }
      }
      return model === 'ready';
    } finally {
      inFlightRef.current = false;
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const loop = async () => {
      const healthy = await check();
      if (cancelled) return;
      timerRef.current = setTimeout(() => void loop(), healthy ? BACKGROUND_MS : ATTENTION_MS);
    };
    void loop();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [check, isAuthenticated]);

  useEffect(() => {
    if (modelOperation === null && isAuthenticated) void check();
  }, [check, isAuthenticated, modelOperation]);

  return useCallback(async () => {
    await check();
  }, [check]);
}
