import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, Trash2, KeyRound, MessageSquare } from 'lucide-react';
import adminService from '../../services/adminService';
import type { AdminUser, UserRole } from '../../types';
import {
  AdminCard,
  AdminCheck,
  AdminError,
  AdminLoading,
  AdminWorkspace,
  adminBtnGhost,
  adminBtnPrimary,
  adminInput,
} from './adminUi';
import { formatAdminDate, getErrorMessage } from './adminUtils';
import { alertDialog, confirmDialog, promptDialog } from '../../services/dialogService';
import { showSuccessToast } from '../../services/toastService';
import {
  type AdminCreateUserField,
  type AdminCreateUserFieldErrors,
  validateAdminCreateUser,
  validateAdminCreateUserField,
} from '../../utils/validation';
import { InlineError } from '../../components/ui/alert-banner';
import { FormField, FormInput } from '../../components/ui/form-field';
import { SelectMenu } from '../../components/ui/select-menu';
import { IconButton } from '../../components/ui/icon-button';
import { EmptyState } from '../../components/ui/page-states';
import { StatusPill } from '../../components/ui/status-pill';
import { cn } from '../../lib/utils';
import { roleLabel, USER_ROLES } from '../../utils/auth';

const EMPTY_CREATE_FORM = {
  email: '',
  password: '',
  displayName: '',
  role: 'user' as UserRole,
};

const ROLE_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: roleLabel(role),
}));

function AdminRoleSelect({
  id,
  value,
  onChange,
  disabled,
  ariaLabel,
  zIndex,
}: {
  id?: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  ariaLabel?: string;
  zIndex?: number;
}) {
  return (
    <SelectMenu
      id={id}
      aria-label={ariaLabel}
      className="w-full"
      triggerClassName={cn(adminInput, 'flex items-center justify-between gap-2 text-left')}
      disabled={disabled}
      zIndex={zIndex}
      value={USER_ROLES.includes(value) ? value : 'user'}
      onChange={(next) => onChange(next as UserRole)}
      options={ROLE_OPTIONS}
    />
  );
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [createErrors, setCreateErrors] = useState<AdminCreateUserFieldErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<AdminCreateUserField, boolean>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingActiveId, setUpdatingActiveId] = useState<string | null>(null);

  const createFormInput = {
    email: newEmail,
    password: newPassword,
    displayName: newDisplayName,
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listUsers({
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setUsers(Array.isArray(res.users) ? res.users : []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetCreateForm = () => {
    setNewEmail(EMPTY_CREATE_FORM.email);
    setNewPassword(EMPTY_CREATE_FORM.password);
    setNewDisplayName(EMPTY_CREATE_FORM.displayName);
    setNewRole(EMPTY_CREATE_FORM.role);
    setCreateErrors({});
    setCreateError(null);
    setTouched({});
    setIsCreating(false);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    resetCreateForm();
  };

  const markTouched = (field: AdminCreateUserField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const updateFieldError = (field: AdminCreateUserField, input = createFormInput) => {
    const message = validateAdminCreateUserField(field, input);
    setCreateErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleEmailChange = (value: string) => {
    setNewEmail(value);
    setCreateError(null);
    if (touched.email) updateFieldError('email', { ...createFormInput, email: value });
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setCreateError(null);
    if (touched.password) updateFieldError('password', { ...createFormInput, password: value });
  };

  const handleDisplayNameChange = (value: string) => {
    setNewDisplayName(value);
    setCreateError(null);
    if (touched.displayName) {
      updateFieldError('displayName', { ...createFormInput, displayName: value });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const validation = validateAdminCreateUser(createFormInput);
    setCreateErrors(validation.errors);
    setTouched({ email: true, password: true, displayName: true });
    if (!validation.valid) return;

    setIsCreating(true);
    try {
      await adminService.createUser({
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        displayName: newDisplayName.trim() || undefined,
        emailVerified: true,
      });
      showSuccessToast(`Пользователь ${newEmail.trim()} создан`);
      closeCreateModal();
      void load();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const fieldHasError = (field: AdminCreateUserField) =>
    Boolean(touched[field] && createErrors[field]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const previous = users.find((user) => user.id === userId)?.role;
    if (!previous || previous === role || updatingRoleId) return;
    setError(null);
    setUpdatingRoleId(userId);
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
    try {
      await adminService.updateUser(userId, { role });
    } catch (err) {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: previous } : user))
      );
      setError(getErrorMessage(err));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleActiveToggle = async (userId: string, isActive: boolean) => {
    const previous = users.find((user) => user.id === userId)?.isActive;
    if (previous === isActive || updatingActiveId) return;
    setError(null);
    setUpdatingActiveId(userId);
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, isActive } : user)));
    try {
      await adminService.updateUser(userId, { isActive });
    } catch (err) {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, isActive: previous } : user))
      );
      setError(getErrorMessage(err));
    } finally {
      setUpdatingActiveId(null);
    }
  };

  const handleInferenceLabToggle = async (userId: string, enabled: boolean) => {
    const previous = users.find((user) => user.id === userId)?.settings?.inferenceLab;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, settings: { ...user.settings, inferenceLab: enabled } }
          : user
      )
    );
    try {
      await adminService.updateUserSettings(userId, { inferenceLab: enabled });
    } catch (err) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, settings: { ...user.settings, inferenceLab: previous } }
            : user
        )
      );
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = await confirmDialog({
      title: 'Удалить пользователя?',
      description: `Удалить пользователя ${user.email}?`,
      destructive: true,
      confirmLabel: 'Удалить',
    });
    if (!confirmed) return;
    try {
      await adminService.deleteUser(user.id);
      showSuccessToast('Пользователь удалён');
      void load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    const password = await promptDialog({
      title: 'Сброс пароля',
      description: `Новый пароль для ${user.email}. Оставьте пустым для автогенерации.`,
      placeholder: 'Новый пароль (необязательно)',
      inputType: 'password',
      confirmLabel: 'Сбросить',
    });
    if (password === null) return;
    try {
      const res = await adminService.resetUserPassword(user.id, password || undefined);
      if (res.temporaryPassword) {
        await alertDialog({
          title: 'Временный пароль',
          description: `Временный пароль: ${res.temporaryPassword}`,
        });
      } else {
        showSuccessToast(res.message ?? 'Пароль обновлён');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AdminWorkspace
      title="Пользователи"
      description={`${total} учётных записей`}
      actions={
        <>
          <label htmlFor="admin-users-search" className="sr-only">
            Поиск по email
          </label>
          <input
            id="admin-users-search"
            name="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email…"
            className={cn(adminInput, 'sm:w-52')}
          />
          <button type="button" onClick={() => void load()} className={adminBtnGhost} title="Обновить">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={openCreateModal} className={adminBtnPrimary}>
            <Plus className="w-3.5 h-3.5" />
            Создать
          </button>
        </>
      }
    >
      {error && <AdminError message={error} />}
      {loading && (users?.length ?? 0) === 0 && <AdminLoading />}

      <AdminCard>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Имя</th>
                <th className="pb-2 pr-3 font-medium">Роль</th>
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Активен</th>
                <th className="pb-2 pr-3 font-medium hidden lg:table-cell">Вход</th>
                <th className="pb-2 pr-3 font-medium">Инференс</th>
                <th className="pb-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-xs max-w-[14rem] truncate" title={user.email}>
                    {user.email}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[10rem] truncate">{user.displayName || '—'}</td>
                  <td className="py-2.5 pr-3 min-w-[9rem]">
                    <AdminRoleSelect
                      ariaLabel={`Роль ${user.email}`}
                      value={user.role}
                      disabled={updatingRoleId === user.id}
                      onChange={(role) => void handleRoleChange(user.id, role)}
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusPill variant={user.emailVerified ? 'success' : 'neutral'} dot>
                      {user.emailVerified ? 'да' : 'нет'}
                    </StatusPill>
                  </td>
                  <td className="py-2.5 pr-3">
                    <AdminCheck
                      id={`user-active-${user.id}`}
                      checked={user.isActive !== false}
                      onChange={(checked) => void handleActiveToggle(user.id, checked)}
                    >
                      <span className="sr-only">Активен</span>
                    </AdminCheck>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                    {formatAdminDate(user.lastLoginAt || user.createdAt)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {user.role === 'employee' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                    <AdminCheck
                      id={`inference-lab-${user.id}`}
                      checked={user.settings?.inferenceLab !== false}
                      onChange={(checked) => void handleInferenceLabToggle(user.id, checked)}
                    >
                      <span className="sr-only">Лаборатория инференса</span>
                    </AdminCheck>
                    )}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-0.5">
                      <Link
                        to={`/admin/users/${user.id}/chats`}
                        className="p-1.5 rounded-xl hover:bg-accent/70 text-muted-foreground hover:text-foreground"
                        title="Чаты пользователя"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleResetPassword(user)}
                        className="p-1.5 rounded-xl hover:bg-accent/70 text-muted-foreground hover:text-foreground"
                        title="Сбросить пароль"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <IconButton
                        variant="danger"
                        label="Удалить"
                        onClick={() => void handleDelete(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!users || users.length === 0) && !loading && (
            <EmptyState message="Пользователи не найдены" className="py-6" />
          )}
        </div>
      </AdminCard>

      {showCreate && (
        <div className="fixed inset-0 modal-scrim flex items-center justify-center z-50 p-4">
          <div
            className="glass-modal rounded-2xl w-full max-w-md p-5 min-w-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
          >
            <h2 id="create-user-title" className="text-sm font-semibold mb-4 text-foreground">
              Новый пользователь
            </h2>

            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3" noValidate>
              {createError && <InlineError message={createError} />}

              <FormField
                label="Email"
                htmlFor="create-user-email"
                required
                error={touched.email ? createErrors.email : null}
              >
                <FormInput
                  id="create-user-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={newEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    markTouched('email');
                    updateFieldError('email');
                  }}
                  hasError={fieldHasError('email')}
                  placeholder="user@example.com"
                  aria-invalid={fieldHasError('email')}
                  className="rounded-xl h-9 py-0"
                />
              </FormField>

              <FormField
                label="Пароль"
                htmlFor="create-user-password"
                required
                hint="Минимум 8 символов"
                error={touched.password ? createErrors.password : null}
              >
                <FormInput
                  id="create-user-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => {
                    markTouched('password');
                    updateFieldError('password');
                  }}
                  hasError={fieldHasError('password')}
                  placeholder="Минимум 8 символов"
                  aria-invalid={fieldHasError('password')}
                  className="rounded-xl h-9 py-0"
                />
              </FormField>

              <FormField
                label="Отображаемое имя"
                htmlFor="create-user-name"
                error={touched.displayName ? createErrors.displayName : null}
              >
                <FormInput
                  id="create-user-name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  value={newDisplayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  onBlur={() => {
                    markTouched('displayName');
                    updateFieldError('displayName');
                  }}
                  hasError={fieldHasError('displayName')}
                  placeholder="Необязательно"
                  aria-invalid={fieldHasError('displayName')}
                  className="rounded-xl h-9 py-0"
                />
              </FormField>

              <FormField label="Роль" htmlFor="create-user-role" showError={false}>
                <AdminRoleSelect
                  id="create-user-role"
                  value={newRole}
                  onChange={setNewRole}
                  disabled={isCreating}
                  zIndex={140}
                />
              </FormField>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isCreating} className={cn(adminBtnPrimary, 'flex-1')}>
                  {isCreating ? 'Создание…' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className={cn(adminBtnGhost, 'flex-1')}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminWorkspace>
  );
};

export default AdminUsersPage;
