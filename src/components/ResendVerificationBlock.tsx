import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { resendVerification } from '../store/authSlice';
import {
  authHintClass,
  authInputClass,
  authSecondaryButtonClass,
} from './auth/authUi';
import { InlineError, InlineSuccess, InlineWarning } from './ui/alert-banner';

interface ResendVerificationBlockProps {
  defaultEmail?: string;
}

const ResendVerificationBlock: React.FC<ResendVerificationBlockProps> = ({ defaultEmail = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await dispatch(resendVerification(email.trim()));
    setLoading(false);
    if (resendVerification.fulfilled.match(result)) {
      setMessage(result.payload.message || 'Письмо отправлено повторно');
    } else {
      setError(
        typeof result.payload === 'string' ? result.payload : 'Не удалось отправить письмо'
      );
    }
  };

  return (
    <div className="space-y-3">
      <InlineWarning message="Подтвердите email перед использованием приложения. Проверьте почту или запросите письмо снова." />
      <label htmlFor="resend-verification-email" className="block space-y-1">
        <span className={authHintClass}>Email</span>
        <input
          id="resend-verification-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
        />
      </label>
      {message && <InlineSuccess message={message} />}
      {error && <InlineError message={error} />}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={loading || !email.trim()}
        className={authSecondaryButtonClass}
      >
        {loading ? 'Отправка...' : 'Отправить письмо повторно'}
      </button>
    </div>
  );
};

export default ResendVerificationBlock;
