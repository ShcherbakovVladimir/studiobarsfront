// /home/user/projects/studioxlam/src/utils/validation.ts
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

export const normalizeNumberString = (str: string, isFloat: boolean): string => {
  let normalized = str;
  
  if (isFloat && normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts[0] === '' || parts[0] === '-') {
      parts[0] = '0';
    }
    normalized = parts.join('.');
  } else if (!isFloat) {
    if (normalized.startsWith('0') && normalized.length > 1) {
      normalized = normalized.replace(/^0+/, '');
    }
    if (normalized === '') normalized = '0';
  }
  
  if (isFloat && normalized.endsWith('.')) {
    return normalized;
  }
  
  return normalized;
};

export const computeFileHash = async (file: File): Promise<string> => {
  // Более надежный хэш с учетом содержимого
  const buffer = await file.slice(0, Math.min(file.size, 65536)).arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hashHex.slice(0, 16)}_${file.size}`;
};

export const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminCreateUserField = 'email' | 'password' | 'displayName';

export interface AdminCreateUserInput {
  email: string;
  password: string;
  displayName: string;
}

export type AdminCreateUserFieldErrors = Partial<Record<AdminCreateUserField, string>>;

export function validateAdminCreateUser(input: AdminCreateUserInput): {
  valid: boolean;
  errors: AdminCreateUserFieldErrors;
} {
  const errors: AdminCreateUserFieldErrors = {};
  const email = input.email.trim();
  const displayName = input.displayName.trim();

  if (!email) {
    errors.email = 'Укажите email';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Некорректный формат email';
  } else if (email.length > 254) {
    errors.email = 'Email слишком длинный (макс. 254 символа)';
  }

  if (!input.password) {
    errors.password = 'Укажите пароль';
  } else if (input.password.length < 8) {
    errors.password = 'Пароль должен быть не менее 8 символов';
  } else if (input.password.length > 128) {
    errors.password = 'Пароль не должен превышать 128 символов';
  }

  if (displayName && displayName.length > 100) {
    errors.displayName = 'Имя не должно превышать 100 символов';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAdminCreateUserField(
  field: AdminCreateUserField,
  input: AdminCreateUserInput
): string | undefined {
  return validateAdminCreateUser(input).errors[field];
}