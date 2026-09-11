import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { verifyEmail } from '../store/authSlice';
import { loadRuntimeConfig } from '../store/runtimeConfigSlice';
import AuthFormCard from '../components/AuthFormCard';
import { authLinkClass, authMutedClass } from '../components/auth/authUi';
import { InlineError, InlineSuccess } from '../components/ui/alert-banner';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>(
    token ? 'loading' : 'missing'
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    void (async () => {
      const result = await dispatch(verifyEmail(token));
      if (verifyEmail.fulfilled.match(result)) {
        setStatus('success');
        setMessage('Email подтверждён. Перенаправление...');
        await dispatch(loadRuntimeConfig());
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } else {
        setStatus('error');
        setMessage(
          typeof result.payload === 'string' ? result.payload : 'Не удалось подтвердить email'
        );
      }
    })();
  }, [token, dispatch, navigate]);

  return (
    <AuthFormCard
      title="Подтверждение email"
      subtitle="Активация аккаунта"
      footer={
        <p className={`text-center ${authMutedClass}`}>
          <Link to="/login" className={authLinkClass}>
            Перейти ко входу
          </Link>
        </p>
      }
    >
      {status === 'loading' && <p className={`text-center py-4 ${authMutedClass}`}>Подтверждение...</p>}
      {status === 'missing' && (
        <InlineError message="Ссылка недействительна: отсутствует токен. Откройте ссылку из письма или запросите новое письмо на странице входа." />
      )}
      {status === 'success' && <InlineSuccess message={message} />}
      {status === 'error' && <InlineError message={message} />}
    </AuthFormCard>
  );
};

export default VerifyEmailPage;
