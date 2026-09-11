import React, { useEffect, useState } from 'react';
import { subscribeToasts, type ToastMessage } from '../services/toastService';

const TOAST_DURATION_MS = 5000;

const GlobalToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, TOAST_DURATION_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none max-w-sm sm:max-w-md"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 duration-300 backdrop-blur-sm ${
            toast.type === 'success'
              ? 'bg-emerald-600/95 text-white dark:bg-emerald-500/90'
              : toast.type === 'error'
                ? 'bg-red-600/95 text-white dark:bg-red-500/90'
                : 'btn-gradient'
          }`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
};

export default GlobalToast;
