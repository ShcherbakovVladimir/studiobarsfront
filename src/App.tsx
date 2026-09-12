import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store/store';
import { loadRuntimeConfig } from './store/runtimeConfigSlice';
import { bootstrapAuth } from './store/authSlice';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import AppPageLayout from './components/layout/AppPageLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GlobalToast from './components/GlobalToast';
import GlobalDialog from './components/GlobalDialog';
import { useThemeSync } from './hooks/useThemeSync';
import { MAIN_APP_PATHS } from './utils/viewModeRoutes';
import { homePath, isEmployee, EMPLOYEE_MAIN_PATHS } from './utils/auth';
import { lazyWithRetry } from './utils/lazyWithRetry';

const MainApp = lazyWithRetry(() => import('./components/MainApp'));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const SystemInfoPage = lazyWithRetry(() => import('./pages/SystemInfoPage'));
const HardwareinfoPage = lazyWithRetry(() => import('./pages/HardwareinfoPage'));
const APITesterPage = lazyWithRetry(() => import('./pages/APITesterPage'));
const AdminLayout = lazyWithRetry(() => import('./pages/admin/AdminLayout'));
const AdminDashboardPage = lazyWithRetry(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazyWithRetry(() => import('./pages/admin/AdminUsersPage'));
const AdminSettingsPage = lazyWithRetry(() => import('./pages/admin/AdminSettingsPage'));
const AdminMaintenancePage = lazyWithRetry(() => import('./pages/admin/AdminMaintenancePage'));
const AdminMailPage = lazyWithRetry(() => import('./pages/admin/AdminMailPage'));
const AdminBackupsPage = lazyWithRetry(() => import('./pages/admin/AdminBackupsPage'));
const AdminAuditPage = lazyWithRetry(() => import('./pages/admin/AdminAuditPage'));
const AdminSystemPage = lazyWithRetry(() => import('./pages/admin/AdminSystemPage'));
const AdminApiTesterPage = lazyWithRetry(() => import('./pages/admin/AdminApiTesterPage'));
const AdminUserChatsPage = lazyWithRetry(() => import('./pages/admin/AdminUserChatsPage'));
const AdminChatsPage = lazyWithRetry(() => import('./pages/admin/AdminChatsPage'));
const AdminSessionsPage = lazyWithRetry(() => import('./pages/admin/AdminSessionsPage'));
const AdminInferenceLabPage = lazyWithRetry(() => import('./pages/admin/AdminInferenceLabPage'));
const AdminHelpPage = lazyWithRetry(() => import('./pages/admin/AdminHelpPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Загрузка…
    </div>
  );
}

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const employee = isEmployee(user);
  const appHome = homePath(user);
  const mainAppPaths = employee ? [...EMPLOYEE_MAIN_PATHS] : MAIN_APP_PATHS;
  useThemeSync();

  useEffect(() => {
    void dispatch(loadRuntimeConfig()).then(() => dispatch(bootstrapAuth()));
  }, [dispatch]);

  return (
    <BrowserRouter>
      <GlobalToast />
      <GlobalDialog />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={appHome} replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to={appHome} replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppPageLayout />}>
            <Route path="/" element={<Navigate to={appHome} replace />} />
            {mainAppPaths.map((path) => (
              <Route
                key={path}
                path={path.replace(/^\//, '')}
                element={<MainApp />}
              />
            ))}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="account" element={<Navigate to="/profile" replace />} />
            <Route path="account/settings" element={<Navigate to="/profile" replace />} />
            <Route path="help" element={<AdminHelpPage />} />
            <Route path="help/:slug" element={<AdminHelpPage />} />
            {!employee && (
              <>
                <Route path="system" element={<SystemInfoPage />} />
                <Route path="hardware" element={<HardwareinfoPage />} />
                <Route path="api-tester" element={<APITesterPage />} />
              </>
            )}
          </Route>
          {!employee && (
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId/chats" element={<AdminUserChatsPage />} />
              <Route path="users/:userId/chats/:chatId" element={<AdminUserChatsPage />} />
              <Route path="chats" element={<AdminChatsPage />} />
              <Route path="sessions" element={<AdminSessionsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="maintenance" element={<AdminMaintenancePage />} />
              <Route path="mail" element={<AdminMailPage />} />
              <Route path="backups" element={<AdminBackupsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="inference-lab" element={<AdminInferenceLabPage />} />
              <Route path="api-tester" element={<AdminApiTesterPage />} />
              <Route path="help" element={<AdminHelpPage />} />
              <Route path="help/:slug" element={<AdminHelpPage />} />
            </Route>
          </Route>
          )}
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? appHome : '/login'} replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
