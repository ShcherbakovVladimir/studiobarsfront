// /home/user/projects/studioxlam/src/utils/errorUtils.ts
import { logError } from './logging';

export interface ServerError {
  error?: string;
  details?: string;
  message?: string;
  [key: string]: unknown;
}

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const serverError = error as ServerError;
    return serverError.error || serverError.details || serverError.message || 'Неизвестная ошибка';
  }

  return 'Неизвестная ошибка';
};

export const formatErrorMessage = (
  error: unknown, 
  defaultMessage: string = 'Произошла ошибка'
): string => {
  const message = formatError(error);
  return message || defaultMessage;
};

export const createLogEntry = (
  message: string, 
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): string => {
  const timestamp = new Date().toISOString();
  const levelPrefix = level.toUpperCase();
  return `[${timestamp}] [${levelPrefix}] ${message}`;
};

export const validateLearningRate = (value: number): { valid: boolean; message?: string } => {
  if (isNaN(value)) {
    return { valid: false, message: 'Learning Rate должен быть числом' };
  }

  if (value < 1e-7) {
    return { valid: false, message: 'Learning Rate должен быть не менее 0.0000001' };
  }

  if (value > 0.01) {
    return { valid: false, message: 'Learning Rate должен быть не более 0.01' };
  }

  if (!Number.isFinite(value)) {
    return { valid: false, message: 'Learning Rate должен быть конечным числом' };
  }

  return { valid: true };
};

export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `finetune_${timestamp}_${random}`;
};

export const handleApiError = async (
  response: Response,
  operationName: string = 'Операция'
): Promise<never> => {
  let errorData: ServerError = {};
  
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: `Ошибка сервера: ${response.status}` };
  }
  
  const errorMessage = errorData.error || errorData.details || errorData.message || 
    `Ошибка ${operationName}: ${response.status}`;
  
  logError(`${operationName}: ${errorMessage}`);
  throw new Error(errorMessage);
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Таймаут операции'
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries - 1) break;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

export const safeJsonParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; message?: string } => {
  const { maxSize = 500 * 1024 * 1024, allowedExtensions = ['.jsonl', '.json', '.parquet', '.csv', '.txt'] } = options;
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      message: `Файл слишком большой. Максимальный размер: ${formatFileSize(maxSize)}` 
    };
  }
  
  const fileExt = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!allowedExtensions.includes(fileExt)) {
    return { 
      valid: false, 
      message: `Недопустимый формат файла. Разрешены: ${allowedExtensions.join(', ')}` 
    };
  }
  
  return { valid: true };
};

export const sanitizeInput = (input: string): string => {
  // Базовая очистка от потенциально опасных символов
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000); // Ограничение длины
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}ч ${minutes % 60}м`;
  } else if (minutes > 0) {
    return `${minutes}м ${seconds % 60}с`;
  } else {
    return `${seconds}с`;
  }
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Неизвестная ошибка';
};

// Утилита для проверки доступности сети
export const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('timeout') ||
         message.includes('connection');
};

// Утилита для форматирования чисел
export const formatNumber = (num: number, precision: number = 2): string => {
  if (num === 0) return '0';
  
  if (num < 0.001) {
    return num.toExponential(precision);
  }
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(precision).replace(/\.0+$/, '')}M`;
  }
  
  if (num >= 1000) {
    return `${(num / 1000).toFixed(precision).replace(/\.0+$/, '')}K`;
  }
  
  const formatted = num.toFixed(precision).replace(/\.0+$/, '');
  return formatted === '' ? '0' : formatted;
};

// Утилита для обработки операций с обработкой ошибок
export const safeOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Ошибка операции'
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    logError(`${errorMessage}: ${getErrorMessage(error)}`);
    return null;
  }
};