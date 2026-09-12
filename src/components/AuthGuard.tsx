import React, { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { logout, setMaintenance } from '../store/authSlice';
import { setUnauthorizedHandler, resetUnauthorizedHandler, setMaintenanceHandler, setForbiddenHandler, clearToken } from '../services/apiClient';
import { showForbiddenToast } from '../services/toastService';
import { homePath, isAdmin, isEmployee, isEmployeeAppPath, setActiveUserRole } from '../utils/auth';
import ResendVerificationBlock from './ResendVerificationBlock';
import AuthThemeToggle from './auth/AuthThemeToggle';
import CelestiaBackground from './layout/CelestiaBackground';
import { StudioLogo } from './brand/StudioLogo';
import { APP_NAME } from '../constants/brand';
import {
  authCardClass,
  authLinkClass,
  authMutedClass,
  authPageClass,
} from './auth/authUi';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';

const AuthGuard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, emailVerificationRequired, maintenance, user } = useSelector(
    (state: RootState) => state.auth
  );
  const configLoaded = useSelector((state: RootState) => state.runtimeConfig.isLoaded);

  useEffect(() => {
    setActiveUserRole(user?.role ?? null);
  }, [user?.role]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      void dispatch(logout());
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    });
    setMaintenanceHandler((data) => {
      dispatch(setMaintenance({ enabled: true, message: typeof data === 'object' && data && 'message' in data ? String((data as { message?: string }).message) : undefined }));
    });
    setForbiddenHandler((message, code) => {
      if (code === 'ROLE_FORBIDDEN') {
        if (!isEmployeeAppPath(window.location.pathname)) {
          navigate('/chat', { replace: true });
        }
        return;
      }
      if (code === 'CHAT_FORBIDDEN' || code === 'SESSION_FORBIDDEN') {
        showForbiddenToast(message || 'Нет доступа к чужим данным');
        return;
      }
      showForbiddenToast(message);
    });
    return () => {
      resetUnauthorizedHandler();
    };
  }, [dispatch, navigate]);

  if (!configLoaded || isLoading) {
    return (
      <div className={cn(celestia.page, authPageClass)}>
        <CelestiaBackground />
        <p className={authMutedClass}>Загрузка…</p>
      </div>
    );
  }

  if (maintenance?.enabled && !isAdmin(user)) {
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
          <div className="p-4 sm:p-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {maintenance.message || 'Сервис временно недоступен.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (emailVerificationRequired) {
    return (
      <div className={cn(celestia.page, authPageClass)}>
        <CelestiaBackground />
        <div className={authCardClass}>
          <header className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
            <div className="flex items-center gap-2 min-w-0 px-1">
              <StudioLogo className="h-7 w-7" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{APP_NAME}</span>
                <span className={cn(authMutedClass, 'block')}>Подтвердите email</span>
              </span>
            </div>
            <AuthThemeToggle floating={false} />
          </header>
          <div className="p-4 sm:p-5 space-y-4">
            <ResendVerificationBlock defaultEmail={user?.email ?? ''} />
            <div className="flex justify-center gap-4">
              <Link to="/login" className={authLinkClass}>
                Войти с другим аккаунтом
              </Link>
              <button
                type="button"
                onClick={() => void dispatch(logout())}
                className={authLinkClass}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEmployee(user) && !isEmployeeAppPath(location.pathname)) {
    return <Navigate to={homePath(user)} replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
