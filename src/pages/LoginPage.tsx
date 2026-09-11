import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import type { AppDispatch, RootState } from '../store/store';
import { login, clearAuthError } from '../store/authSlice';
import { loadRuntimeConfig } from '../store/runtimeConfigSlice';
import ResendVerificationBlock from '../components/ResendVerificationBlock';
import AuthFormCard from '../components/AuthFormCard';
import {
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMutedClass,
} from '../components/auth/authUi';
import { InlineError } from '../components/ui/alert-banner';
import { postLoginPath } from '../utils/auth';
import { cn } from '../lib/utils';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error, emailVerificationRequired } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearAuthError());
    setIsSubmitting(true);
    try {
      const result = await dispatch(login({ email: email.trim(), password }));
      if (login.fulfilled.match(result)) {
        await dispatch(loadRuntimeConfig());
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
        navigate(postLoginPath(result.payload.user, from), { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormCard
      title="Вход"
      subtitle="Войдите в рабочее пространство."
      footer={
        <p className={`text-center ${authMutedClass}`}>
          Нет аккаунта?{' '}
          <Link to="/register" className={authLinkClass}>
            Регистрация
          </Link>
        </p>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        {error && <InlineError message={error} />}

        {emailVerificationRequired && <ResendVerificationBlock defaultEmail={email} />}

        <label htmlFor="login-email" className="block space-y-1.5 min-w-0">
          <span className={authLabelClass}>Email</span>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInputClass}
          />
        </label>

        <label htmlFor="login-password" className="block space-y-1.5 min-w-0">
          <span className={authLabelClass}>Пароль</span>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className={cn(authInputClass, 'pr-10')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/70"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>

        <div className="flex justify-end">
          <Link to="/forgot-password" className={authLinkClass}>
            Забыли пароль?
          </Link>
        </div>

        <button type="submit" disabled={isSubmitting || !email.trim() || !password} className={authButtonClass}>
          {isSubmitting ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </AuthFormCard>
  );
};

export default LoginPage;
