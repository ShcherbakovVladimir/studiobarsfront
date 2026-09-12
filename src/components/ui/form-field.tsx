import * as React from 'react';
import { cn } from '../../lib/utils';

export const inputBaseClass =
  'w-full glass-input rounded-3xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed';

export const inputErrorClass =
  'border-red-500 dark:border-red-500 focus:ring-red-500/30';

export const selectBaseClass =
  'w-full glass-input rounded-2xl px-4 py-2.5 pr-10 text-sm focus:outline-none appearance-none bg-no-repeat bg-[length:1rem] bg-[right_0.9rem_center] cursor-pointer';

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormLabel({ required, className, children, ...props }: FormLabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-foreground/80 mb-1', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

interface FieldErrorProps {
  id?: string;
  message?: string | null;
  className?: string;
}

export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className={cn('mt-1 text-xs text-red-600 dark:text-red-400', className)}>
      {message}
    </p>
  );
}

interface FieldHintProps {
  id?: string;
  message?: string | null;
  className?: string;
}

export function FieldHint({ id, message, className }: FieldHintProps) {
  if (!message) return null;
  return (
    <p id={id} className={cn('mt-1 text-xs text-muted-foreground', className)}>
      {message}
    </p>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputBaseClass, hasError && inputErrorClass, className)}
      {...props}
    />
  )
);
FormInput.displayName = 'FormInput';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ hasError, className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(selectBaseClass, hasError && inputErrorClass, className)}
      {...props}
    >
      {children}
    </select>
  )
);
FormSelect.displayName = 'FormSelect';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string | null;
  hint?: string | null;
  showError?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  showError = true,
  children,
  className,
}: FormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={className}>
      <FormLabel htmlFor={htmlFor} required={required}>
        {label}
      </FormLabel>
      {children}
      {hint && <FieldHint id={hintId} message={hint} />}
      {showError && error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
