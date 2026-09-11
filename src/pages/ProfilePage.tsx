import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import {
  changePassword,
  fetchUserSettings,
  saveUserSettings,
  updateProfile,
} from '../store/authSlice';
import type { UserSettings } from '../types';
import { homePath, isEmployee } from '../utils/auth';
import { InlineError, InlineSuccess } from '../components/ui/alert-banner';
import { PanelCard } from '../components/ui/panel-card';

type ProfileTab = 'profile' | 'password' | 'settings';

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [tab, setTab] = useState<ProfileTab>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsJson, setSettingsJson] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const result = await dispatch(fetchUserSettings());
    if (fetchUserSettings.fulfilled.match(result)) {
      setSettingsJson(JSON.stringify(result.payload, null, 2));
    }
  }, [dispatch]);

  const handleTabChange = (nextTab: ProfileTab) => {
    setTab(nextTab);
    setError(null);
    setMessage(null);
    if (nextTab === 'settings') {
      void loadSettings();
    }
    if (nextTab === 'profile' && user?.displayName) {
      setDisplayName(user.displayName);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await dispatch(updateProfile(displayName.trim()));
    setLoading(false);
    if (updateProfile.fulfilled.match(result)) {
      setMessage('Профиль обновлён');
    } else {
      setError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await dispatch(changePassword({ currentPassword, newPassword }));
    setLoading(false);
    if (changePassword.fulfilled.match(result)) {
      setMessage('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(typeof result.payload === 'string' ? result.payload : 'Ошибка смены пароля');
    }
  };

  const handleSaveSettings = async () => {
    let parsed: UserSettings;
    try {
      parsed = JSON.parse(settingsJson) as UserSettings;
    } catch {
      setError('Некорректный JSON настроек');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await dispatch(saveUserSettings(parsed));
    setLoading(false);
    if (saveUserSettings.fulfilled.match(result)) {
      setMessage('Настройки сохранены на сервере');
      setSettingsJson(JSON.stringify(result.payload, null, 2));
    } else {
      setError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения настроек');
    }
  };

  const employee = isEmployee(user);
  const visibleTab = employee && tab === 'settings' ? 'profile' : tab;
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'profile', label: 'Профиль' },
    { id: 'password', label: 'Пароль' },
    ...(!employee ? [{ id: 'settings' as const, label: 'Настройки сервера' }] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Аккаунт</h1>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <Link
              to={homePath(user)}
              className="text-sm text-primary hover:underline shrink-0"
            >
              ← В приложение
            </Link>
          </div>

          <div className="flex gap-2 mb-6 border-b border-border pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  visibleTab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:bg-accent/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {message && <InlineSuccess message={message} className="mb-4" />}
          {error && <InlineError message={error} className="mb-4" />}

          <PanelCard className="p-6">
            {visibleTab === 'profile' && (
              <div className="space-y-4">
                <label htmlFor="profile-email" className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm opacity-70"
                  />
                </label>
                <label htmlFor="profile-display-name" className="block space-y-1">
                  <span className="text-sm font-medium">Отображаемое имя</span>
                  <input
                    id="profile-display-name"
                    name="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                  />
                </label>
                <div className="text-xs text-muted-foreground">
                  Роль: {user?.role ?? '—'} · Email подтверждён:{' '}
                  {user?.emailVerified ? 'да' : 'нет'}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg btn-gradient text-white text-sm disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Сохранить профиль'}
                </button>
              </div>
            )}

            {visibleTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <label htmlFor="profile-current-password" className="block space-y-1">
                  <span className="text-sm font-medium">Текущий пароль</span>
                  <input
                    id="profile-current-password"
                    name="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                  />
                </label>
                <label htmlFor="profile-new-password" className="block space-y-1">
                  <span className="text-sm font-medium">Новый пароль</span>
                  <input
                    id="profile-new-password"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                  />
                </label>
                <label htmlFor="profile-confirm-password" className="block space-y-1">
                  <span className="text-sm font-medium">Подтвердите пароль</span>
                  <input
                    id="profile-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg btn-gradient text-white text-sm disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </form>
            )}

            {visibleTab === 'settings' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Пользовательские настройки с сервера (`GET/PUT /user/settings`). Сохраняются в
                  PostgreSQL и доступны после входа на любом устройстве.
                </p>
                <label htmlFor="profile-settings-json" className="block text-sm font-medium">
                  JSON настроек
                </label>
                <textarea
                  id="profile-settings-json"
                  name="settingsJson"
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                  rows={14}
                  className="w-full font-mono text-xs rounded-lg border border-border bg-background/40 px-3 py-2"
                  spellCheck={false}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveSettings()}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg btn-gradient text-white text-sm disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить на сервер'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadSettings()}
                    className="px-4 py-2 rounded-lg border border-border text-sm"
                  >
                    Обновить
                  </button>
                </div>
              </div>
            )}
          </PanelCard>
        </div>
  );
};

export default ProfilePage;
