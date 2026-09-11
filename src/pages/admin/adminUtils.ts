import { ApiError } from '../../services/apiClient';

export function formatAdminDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

export function formatAdminTimestamp(value?: number | string): string {
  if (value == null || value === '') return '—';
  const date =
    typeof value === 'number'
      ? new Date(value < 1e12 ? value * 1000 : value)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ru-RU');
}

export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Неизвестная ошибка';

  if (raw.includes('CHAT_FORBIDDEN') || (error instanceof ApiError && error.code === 'CHAT_FORBIDDEN')) {
    return 'Нет доступа к чужим чатам.';
  }
  if (raw.includes('SESSION_FORBIDDEN') || (error instanceof ApiError && error.code === 'SESSION_FORBIDDEN')) {
    return 'Нет доступа к чужим RAG-сессиям.';
  }
  if (raw.includes('INVALID_ROLE') || (error instanceof ApiError && error.code === 'INVALID_ROLE')) {
    return 'Недопустимая роль. Допустимы: user, employee, admin.';
  }
  if (raw.includes('users_role_check')) {
    return 'База ещё не принимает роль «сотрудник». Обновите constraint users_role_check: role IN (\'user\', \'admin\', \'employee\').';
  }
  return raw || 'Неизвестная ошибка';
}
