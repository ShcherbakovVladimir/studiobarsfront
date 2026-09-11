import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import type { AppDispatch, RootState } from '../store/store';
import { register, clearAuthError } from '../store/authSlice';
import ResendVerificationBlock from '../components/ResendVerificationBlock';
import AuthFormCard from '../components/AuthFormCard';
import {
  authButtonClass,
  authHintClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from '../components/auth/authUi';
import { InlineError, InlineSuccess } from '../components/ui/alert-banner';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error } = useSelector((state: RootState) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearAuthError());
    setSuccessMessage(null);
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await dispatch(register({ email, password, displayName: displayName || undefined }));
      if (register.fulfilled.match(result)) {
        setSuccessMessage(result.payload.message || 'Регистрация успешна. Проверьте email.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormCard
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы пользоваться студией."
      footer={
        <p className={`text-center ${authMutedClass}`}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className={authLinkClass}>
            Войти
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || localError) && <InlineError message={error || localError || ''} />}
        {successMessage && (
          <div className="space-y-3">
            <InlineSuccess message={successMessage} />
            <ResendVerificationBlock defaultEmail={email} />
          </div>
        )}

        <label htmlFor="register-display-name" className="block space-y-1">
          <span className={authLabelClass}>Имя</span>
          <input
            id="register-display-name"
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={authInputClass}
          />
        </label>

        <label htmlFor="register-email" className="block space-y-1">
          <span className={authLabelClass}>Email</span>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </label>

        <label htmlFor="register-password" className="block space-y-1">
          <span className={authLabelClass}>Пароль</span>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
          <span className={authHintClass}>Минимум 8 символов</span>
        </label>

        <label htmlFor="register-password-confirm" className="block space-y-1">
          <span className={authLabelClass}>Повтор пароля</span>
          <input
            id="register-password-confirm"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInputClass}
          />
        </label>

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthFormCard>
  );
};

export default RegisterPage;
