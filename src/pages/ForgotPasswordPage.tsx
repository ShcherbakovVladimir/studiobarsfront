import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await authService.forgotPassword(email.trim());
      setMessage(res.message || 'Если аккаунт существует, письмо отправлено на указанный email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard
      title="Восстановление пароля"
      subtitle="Введите email — мы отправим ссылку для сброса"
      footer={
        <p className={`text-center ${authMutedClass}`}>
          <Link to="/login" className={authLinkClass}>
            Вернуться ко входу
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <InlineError message={error} />}
        {message && <InlineSuccess message={message} />}
        <label htmlFor="forgot-password-email" className="block space-y-1">
          <span className={authLabelClass}>Email</span>
          <input
            id="forgot-password-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </label>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Отправка...' : 'Отправить ссылку'}
        </button>
      </form>
    </AuthFormCard>
  );
};

export default ForgotPasswordPage;
