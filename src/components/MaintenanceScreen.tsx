import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { bootstrapAuth, logout, setMaintenance } from '../store/authSlice';
import { probeMaintenance } from '../services/healthService';
import AuthThemeToggle from './auth/AuthThemeToggle';
import CelestiaBackground from './layout/CelestiaBackground';
import { StudioLogo } from './brand/StudioLogo';
import { APP_NAME } from '../constants/brand';
import { authCardClass, authLinkClass, authMutedClass, authPageClass } from './auth/authUi';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';

const RECHECK_MS = 15_000;

/** Экран `503 MAINTENANCE` (FRONTEND_SERVER_MODEL_CONTROL §2.1, §10). Сам снимается, когда бэкенд перестаёт отвечать 503. */
const MaintenanceScreen: React.FC<{ message?: string }> = ({ message }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const result = await probeMaintenance();
      setLastCheck(new Date().toLocaleTimeString());
      setUnreachable(result === 'unreachable');
      if (result === 'clear') {
        dispatch(setMaintenance(null));
        void dispatch(bootstrapAuth());
      }
    } finally {
      setChecking(false);
    }
  }, [dispatch]);

  useEffect(() => {
    const timer = window.setInterval(() => void recheck(), RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [recheck]);

  return (
    <div className={cn(celestia.page, authPageClass)}>
      <CelestiaBackground />
      <div className={authCardClass}>
        <header className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
          <div className="flex items-center gap-2 min-w-0 px-1">
            <StudioLogo className="h-7 w-7" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{APP_NAME}</span>
              <span className={cn(authMutedClass, 'block')}>Техработы</span>
            </span>
          </div>
          <AuthThemeToggle floating={false} />
        </header>
        <div className="p-4 sm:p-5 text-center space-y-3">
          <p className="text-sm text-foreground">{message || 'Сервис временно недоступен.'}</p>
          <p className={authMutedClass}>
            Страница проверяет доступность каждые {RECHECK_MS / 1000} с и откроется сама, когда работы закончатся.
            История чатов не теряется.
          </p>
          {unreachable && <p className="text-xs text-destructive">Сервер сейчас не отвечает.</p>}
          <div className="flex flex-wrap justify-center items-center gap-4 pt-1">
            <button type="button" className={authLinkClass} disabled={checking} onClick={() => void recheck()}>
              {checking ? 'Проверка…' : 'Проверить сейчас'}
            </button>
            {user ? (
              <button
                type="button"
                className={authLinkClass}
                onClick={() => void dispatch(logout()).finally(() => navigate('/login'))}
              >
                Войти как администратор
              </button>
            ) : (
              <Link to="/login" className={authLinkClass}>
                Войти как администратор
              </Link>
            )}
          </div>
          {lastCheck && <p className="text-[11px] text-muted-foreground">Последняя проверка: {lastCheck}</p>}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
