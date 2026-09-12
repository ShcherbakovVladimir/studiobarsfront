import React from 'react';
import { InlineError, InlineSuccess } from '../../components/ui/alert-banner';
import { LoadingState } from '../../components/ui/page-states';
import { cn } from '../../lib/utils';
import { celestia } from '../../lib/celestia';

export const adminBtn =
  'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none';

export const adminBtnPrimary = cn(adminBtn, 'btn-gradient text-white');
export const adminBtnGhost = cn(adminBtn, 'bg-accent hover:bg-border text-foreground');
export const adminBtnDanger = cn(
  adminBtn,
  'text-destructive hover:bg-destructive/10 border border-destructive/20'
);
export const adminInput =
  'h-8 w-full min-w-0 px-2.5 rounded-xl text-xs glass-input disabled:opacity-70';
export const adminTextarea =
  'w-full min-w-0 px-2.5 py-2 rounded-xl text-xs glass-input disabled:opacity-70';

export const AdminError: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => <InlineError message={message} className={className ?? 'mb-3'} />;

export const AdminSuccess: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => <InlineSuccess message={message} className={className ?? 'mb-3'} />;

export const AdminLoading: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingState message={message} />
);

interface AdminWorkspaceProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  title,
  description,
  actions,
  children,
  bodyClassName,
}) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden glass-panel text-foreground">
    <header className={cn(celestia.appHeader, 'flex items-center')}>
      <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="shrink-0 text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <>
              <span className="hidden sm:block h-4 w-px bg-border shrink-0" />
              <span className="min-w-0 truncate text-xs sm:text-sm text-muted-foreground">
                {description}
              </span>
            </>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
    <div className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4', bodyClassName)}>
      {children}
    </div>
  </div>
);


interface AdminCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ title, children, className }: AdminCardProps) {
  return (
    <div className={cn('min-w-0 rounded-2xl border border-border bg-background/50 p-3 sm:p-4', className)}>
      {title && <h3 className="text-sm font-semibold mb-3 text-foreground">{title}</h3>}
      {children}
    </div>
  );
}

interface AdminFieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminField({ label, htmlFor, children, className }: AdminFieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm min-w-0', className)}>
      <span className="text-xs text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}

interface AdminCheckProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  name?: string;
}

export function AdminCheck({ id, name, checked, onChange, children }: AdminCheckProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm min-w-0 cursor-pointer">
      <input
        id={id}
        name={name ?? id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-border"
      />
      <span className="min-w-0 break-words">{children}</span>
    </label>
  );
}
