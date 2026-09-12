import type { User, UserRole } from '../types';

export const USER_ROLES: UserRole[] = ['user', 'employee', 'admin'];

/** RAG-набор tools для employee. Bitrix / tenders / admin-tools сюда не входят. */
export const EMPLOYEE_TOOL_NAMES = new Set([
  'search_documents',
  'ask_rag',
  'calculate',
  'get_weather',
]);

export const ADMIN_TOOL_NAMES = new Set(['get_server_status', 'list_models', 'load_model']);

type ToolFeatures = { bitrix24Enabled?: boolean };

let runtimeToolFeatures: ToolFeatures | null = null;

export function setRuntimeToolFeatures(features: ToolFeatures | null | undefined): void {
  runtimeToolFeatures = features ?? null;
}

export const EMPLOYEE_MAIN_PATHS = ['/chat', '/rag'] as const;

let activeUserRole: UserRole | null = null;

export function setActiveUserRole(role: UserRole | null | undefined): void {
  activeUserRole = role ?? null;
}

export function getActiveUserRole(): UserRole | null {
  return activeUserRole;
}

export function parseUserRole(role: unknown): UserRole {
  if (role === 'admin' || role === 'employee' || role === 'user') return role;
  return 'user';
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isEmployee(user: User | null | undefined): boolean {
  return user?.role === 'employee';
}

export function roleLabel(role: UserRole | string | undefined): string {
  if (role === 'admin') return 'Администратор';
  if (role === 'employee') return 'Сотрудник';
  return 'Пользователь';
}

export function homePath(user: User | null | undefined): string {
  return isEmployee(user) ? '/chat' : '/catalog';
}

/** Разрешённые SPA-пути employee: чат, RAG, аккаунт, справка. */
export function isEmployeeAppPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/rag') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/help')
  );
}

export function postLoginPath(user: User | null | undefined, from?: string | null): string {
  if (isEmployee(user)) {
    if (from && isEmployeeAppPath(from) && from !== '/') return from;
    return '/chat';
  }
  if (from && from !== '/login' && from !== '/') return from;
  return '/catalog';
}

export function isEmployeeToolName(name: string | undefined | null): boolean {
  return Boolean(name && EMPLOYEE_TOOL_NAMES.has(name));
}

function toolNameOf<T extends { function?: { name?: string }; name?: string }>(tool: T): string {
  return tool.function?.name || tool.name || '';
}

function isBitrixToolName(name: string): boolean {
  return name.startsWith('bitrix_') || name === 'create_bitrix_lead' || name === 'create_bitrix24_lead';
}

export function filterToolsForRole<T extends { function?: { name?: string }; name?: string }>(
  tools: T[],
  role: UserRole | null | undefined = getActiveUserRole(),
  features: ToolFeatures | null | undefined = runtimeToolFeatures
): T[] {
  if (role === 'employee') {
    return tools.filter((tool) => isEmployeeToolName(toolNameOf(tool)));
  }
  let next = tools;
  if (role !== 'admin') {
    next = next.filter((tool) => !ADMIN_TOOL_NAMES.has(toolNameOf(tool)));
  }
  if (features?.bitrix24Enabled === false) {
    next = next.filter((tool) => !isBitrixToolName(toolNameOf(tool)));
  }
  return next;
}

export function canExecuteToolForRole(
  name: string,
  role: UserRole | null | undefined = getActiveUserRole()
): boolean {
  if (role !== 'employee') return true;
  return isEmployeeToolName(name);
}
