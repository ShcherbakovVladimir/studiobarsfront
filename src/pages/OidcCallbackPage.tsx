import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { bootstrapAuth } from '../store/authSlice';
import { loadRuntimeConfig } from '../store/runtimeConfigSlice';
import { setToken } from '../services/apiClient';
import AuthFormCard from '../components/AuthFormCard';
import { authLinkClass, authMutedClass } from '../components/auth/authUi';
import { InlineError, InlineSuccess } from '../components/ui/alert-banner';
import { postLoginPath } from '../utils/auth';
import type { User } from '../types';

function readAccessTokenFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get('accessToken') ?? params.get('access_token');
  return token?.trim() || null;
}

const OidcCallbackPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const initialToken = readAccessTokenFromHash();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    initialToken ? 'loading' : 'error'
  );
  const [message, setMessage] = useState<string | null>(
    initialToken ? null : 'В ссылке нет accessToken. Войдите снова через корпоративную кнопку.'
  );

  useEffect(() => {
    if (!initialToken) return;

    setToken(initialToken);
    window.history.replaceState(null, '', window.location.pathname);

    let cancelled = false;
    void (async () => {
      await dispatch(loadRuntimeConfig());
      const result = await dispatch(bootstrapAuth());
      if (cancelled) return;
      if (bootstrapAuth.fulfilled.match(result) && result.payload?.user) {
        setStatus('success');
        setMessage('Вход выполнен. Перенаправление…');
        const user = result.payload.user as User;
        setTimeout(() => navigate(postLoginPath(user), { replace: true }), 800);
        return;
      }
      setStatus('error');
      setMessage(
        typeof result.payload === 'string'
          ? result.payload
          : 'Токен получен, но профиль не загрузился'
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, initialToken]);

  return (
    <AuthFormCard
      title="Корпоративный вход"
      subtitle="Завершение OpenID Connect"
      footer={
        <p className={`text-center ${authMutedClass}`}>
          <Link to="/login" className={authLinkClass}>
            На страницу входа
          </Link>
        </p>
      }
    >
      {status === 'loading' && <p className={`text-center py-4 ${authMutedClass}`}>Вход…</p>}
      {status === 'success' && <InlineSuccess message={message} />}
      {status === 'error' && <InlineError message={message} />}
    </AuthFormCard>
  );
};

export default OidcCallbackPage;
