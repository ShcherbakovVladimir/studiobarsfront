import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authService from '../services/authService';
import AuthFormCard from '../components/AuthFormCard';
import {
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from '../components/auth/authUi';
import { InlineError, InlineSuccess } from '../components/ui/alert-banner';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Отсутствует токен сброса. Перейдите по ссылке из письма.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authService.resetPassword(token, password);
      setMessage(res.message || 'Пароль успешно изменён');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard
      title="Новый пароль"
      subtitle="Задайте новый пароль для вашего аккаунта"
      footer={
        <p className={`text-center ${authMutedClass}`}>
          <Link to="/login" className={authLinkClass}>
            Вернуться ко входу
          </Link>
        </p>
      }
    >
      {!token ? (
        <InlineError
          message={
            <>
              Недействительная ссылка. Запросите сброс пароля заново.{' '}
              <Link to="/forgot-password" className={authLinkClass}>
                Забыли пароль?
              </Link>
            </>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <InlineError message={error} />}
          {message && <InlineSuccess message={message} />}
          <label htmlFor="reset-password-new" className="block space-y-1">
            <span className={authLabelClass}>Новый пароль</span>
            <input
              id="reset-password-new"
              name="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
          </label>
          <label htmlFor="reset-password-confirm" className="block space-y-1">
            <span className={authLabelClass}>Подтвердите пароль</span>
            <input
              id="reset-password-confirm"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputClass}
            />
          </label>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      )}
    </AuthFormCard>
  );
};

export default ResetPasswordPage;
