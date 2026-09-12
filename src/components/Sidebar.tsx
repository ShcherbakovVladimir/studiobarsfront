import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  BarChart3,
  Gauge,
  Bot,
  GraduationCap,
  Sparkles,
  FileText,
  Cpu,
  Terminal,
  Shield,
  RefreshCw,
  Sun,
  Moon,
  X,
  UserRound,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { type XLAMModel } from '../types';
import type { AppDispatch, RootState } from '../store/store';
import { logout } from '../store/authSlice';
import { clearChatList } from '../store/chatListSlice';
import { toggleTheme, setServerStatus } from '../store/appSlice';
import agentService from '../services/agentService';
import { setServerModels, setActiveModel } from '../store/modelsSlice';
import { isAdmin, isEmployee, homePath, roleLabel } from '../utils/auth';
import { isServerOnline } from '../utils/serverStatus';
import { formatLoadedModelLabel } from '../utils/modelDisplay';
import { gpuDotColor } from '../utils/gpuUtils';
import { cn } from '../lib/utils';
import { celestia } from '../lib/celestia';
import { StudioLogo } from './brand/StudioLogo';

interface SidebarProps {
  onRefreshModels?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface ServerModel {
  id?: string;
  name?: string;
  parameters?: string;
  type?: string;
  description?: string;
  capabilities?: string[];
  available?: boolean;
  active?: boolean;
  size?: string;
  recommended?: boolean;
  file?: string;
  path?: string;
  supportsTools?: boolean;
  quantType?: string;
  isInstruct?: boolean;
  chatTemplate?: string;
  rawSize?: number;
  lastScanned?: string;
  modelFamily?: string;
  relativePath?: string;
  directory?: string;
  favorite?: boolean;
}

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ path: string; label: string; icon: LucideIcon }>;
}> = [
  {
    title: 'Рабочее пространство',
    items: [
      { path: '/catalog', label: 'Каталог моделей', icon: LayoutGrid },
      { path: '/rag', label: 'RAG-аналитика', icon: BarChart3 },
      { path: '/benchmark', label: 'Производительность', icon: Gauge },
      { path: '/agent-lab', label: 'Лаборатория агентов', icon: Bot },
      { path: '/finetune', label: 'Дообучение', icon: GraduationCap },
      { path: '/inference', label: 'Лаборатория инференса', icon: Sparkles },
    ],
  },
  {
    title: 'Система',
    items: [
      { path: '/system', label: 'Система', icon: FileText },
      { path: '/hardware', label: 'Железо', icon: Cpu },
      { path: '/api-tester', label: 'Тест API', icon: Terminal },
    ],
  },
];

const EMPLOYEE_NAV: Array<{ path: string; label: string; icon: LucideIcon }> = [
  { path: '/chat', label: 'Помощник AI', icon: MessageSquare },
  { path: '/rag', label: 'Аналитик', icon: BarChart3 },
];

const toModelFamily = (family: string | undefined): XLAMModel['modelFamily'] => {
  const validFamilies: XLAMModel['modelFamily'][] = [
    'llama', 'mistral', 'saiga', 'xlam', 'deepseek', 'zephyr', 'qwen', 'unknown',
  ];
  if (!family) return 'unknown';
  return validFamilies.includes(family as XLAMModel['modelFamily'])
    ? (family as XLAMModel['modelFamily'])
    : 'unknown';
};

function formatServerModel(model: ServerModel) {
  return {
    id: model.id || `server_${model.name || 'unknown'}`,
    name: model.name || 'Unknown Model',
    parameters: model.parameters || '8B',
    updated: model.lastScanned || (new Date().toISOString().split('T')[0] ?? ''),
    type: model.type || 'GGUF',
    description: model.description || 'Server model',
    isGGUF: true,
    capabilities: model.capabilities || ['Рассуждение', 'Планирование'],
    available: model.available || false,
    active: model.active || false,
    size: model.size || 'N/A',
    rawSize: model.rawSize || 0,
    recommended: model.recommended || false,
    source: 'server' as const,
    modelKey: model.id || '',
    file: model.file || '',
    path: model.path || '',
    supportsTools: model.supportsTools || false,
    quantType: model.quantType,
    isInstruct: model.isInstruct,
    chatTemplate: model.chatTemplate,
    modelFamily: toModelFamily(model.modelFamily),
    relativePath: model.relativePath || '',
    directory: model.directory || '',
    lastScanned: model.lastScanned,
    favorite: model.favorite || false,
  };
}

const navItemClass = (active: boolean) =>
  cn(
    'group relative w-full flex items-center gap-2 px-3 py-2.5 rounded-3xl text-left no-underline',
    'text-[13px] leading-snug font-medium transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    'text-foreground/80 hover:text-foreground',
    active
      ? 'bg-primary/10 border border-primary/20 shadow-sm text-foreground'
      : 'border border-transparent opacity-80 hover:opacity-100 hover:bg-accent/60 hover:border-border/60'
  );

const footerNavBtnClass = (active: boolean) =>
  cn(
    'flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium transition-colors duration-200',
    active
      ? 'bg-accent text-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  );

const footerCardClass =
  'rounded-2xl border border-border/60 bg-accent/25 dark:bg-accent/15 px-2.5 py-2';

const iconBtnClass = cn(
  'p-1.5 rounded-xl transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
  'text-foreground/70 hover:text-foreground hover:bg-accent/70'
);

function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <NavLink to={to} onClick={onNavigate} className={({ isActive }) => navItemClass(isActive)}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate tracking-tight">{label}</span>
    </NavLink>
  );
}

function UsageMeter({
  label,
  value,
  extra,
}: {
  label: React.ReactNode;
  value: number;
  extra?: React.ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const fillTone =
    pct >= 85 ? 'bg-destructive/70' : pct >= 60 ? 'bg-foreground/45' : 'bg-foreground/25';
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-mono tabular-nums text-foreground/70 shrink-0">
          {extra ?? `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-border/80 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', fillTone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const Sidebar: React.FC<SidebarProps> = ({
  onRefreshModels,
  isOpen = false,
  onClose = () => {},
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, serverStatus } = useSelector((state: RootState) => state.app);
  const hardwareStats = useSelector((state: RootState) => state.app.hardwareStats);
  const catalogModels = useSelector((state: RootState) => state.models.models);
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const runtimeFeatures = useSelector((state: RootState) => state.runtimeConfig.config?.features);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const closeIfMobile = () => {
    if (window.innerWidth < 768) onClose();
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      const serverModels = await agentService.getModels(true);
      const status = await agentService.getServerStatus();
      dispatch(setServerStatus(status));
      if (status.activeModel) dispatch(setActiveModel(status.activeModel));
      if (serverModels && serverModels.length > 0) {
        dispatch(setServerModels(serverModels.map((model: ServerModel) => formatServerModel(model))));
      }
      onRefreshModels?.();
    } catch (error) {
      console.error('Error rescanning models:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isRouteActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const triggerStatusCheck = async () => {
    const status = await agentService.getServerStatus();
    dispatch(setServerStatus(status));
  };

  const cpuValue = hardwareStats.cpu || 0;
  const memoryValue = hardwareStats.memory || 0;
  const diskValue = hardwareStats.disk || 0;
  const gpuSnapshots = (
    hardwareStats.gpus && hardwareStats.gpus.length > 0
      ? hardwareStats.gpus
      : [
          {
            key: 'gpu0',
            index: 0,
            utilization: hardwareStats.gpu || 0,
            temperature: hardwareStats.temperature || 0,
            used_mb: 0,
            total_mb: 0,
            percentage: 0,
          },
        ]
  ).slice(0, 2);

  const online = isServerOnline(serverStatus);
  const checking = serverStatus.status === 'checking';
  const activeModelId = serverStatus.activeModel;
  const loadedCatalogModel = activeModelId
    ? catalogModels.find((model) => model.id === activeModelId) ??
      catalogModels.find((model) => model.active)
    : null;
  const loadedLabel = formatLoadedModelLabel(loadedCatalogModel);
  const modelName = activeModelId
    ? (loadedLabel && loadedLabel !== 'Unknown Model'
        ? loadedLabel
        : activeModelId.split('/').pop() || activeModelId)
    : 'не загружена';
  const modelTitle = activeModelId
    ? [
        loadedLabel && loadedLabel !== activeModelId ? loadedLabel : null,
        `id: ${activeModelId}`,
        serverStatus.serverReady || serverStatus.modelLoaded ? 'готова' : 'ещё не готова',
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Модель не загружена';
  const employee = isEmployee(user);
  const showInferenceLab =
    !employee &&
    (runtimeFeatures?.inferenceLabEnabled ?? true) &&
    (!(runtimeFeatures?.inferenceLabAdminOnly ?? false) || user?.role === 'admin');
  const userLabel = user?.displayName || user?.email || '';
  const userInitial = (userLabel.trim().charAt(0) || '?').toUpperCase();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-500 ease-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen w-64 flex-col',
          celestia.sidebar,
          'text-foreground',
          '[&_a]:text-inherit [&_a:hover]:text-inherit',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
        )}
      >
        <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
          <button
            type="button"
            onClick={() => {
              navigate(homePath(user));
              closeIfMobile();
            }}
            className="flex items-center gap-2 min-w-0 rounded-xl px-1 hover:bg-accent/50 transition-colors duration-200"
          >
            <StudioLogo className="h-7 w-7" />
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-foreground leading-tight truncate">
                {employee ? 'xLAM' : 'Студия xLAM'}
              </span>
              <span className="block text-[10px] text-muted-foreground leading-tight">
                {employee ? 'Рабочее место' : 'Рабочая среда'}
              </span>
            </span>
          </button>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className={iconBtnClass}
              title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
              aria-label={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode
                ? <Sun className="w-4 h-4 transition-transform duration-500 ease-out rotate-0" />
                : <Moon className="w-4 h-4 transition-transform duration-500 ease-out rotate-0" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(iconBtnClass, 'md:hidden')}
              aria-label="Закрыть меню"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-4">
          {employee ? (
            <div>
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Приложение
              </p>
              <div className="space-y-0.5">
                {EMPLOYEE_NAV.map((item) => (
                  <NavItem
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    label={item.label}
                    onNavigate={closeIfMobile}
                  />
                ))}
              </div>
            </div>
          ) : (
            NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items
                    .filter((item) => item.path !== '/inference' || showInferenceLab)
                    .map((item) => (
                    <NavItem
                      key={item.path}
                      to={item.path}
                      icon={item.icon}
                      label={item.label}
                      onNavigate={closeIfMobile}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

          <div className="shrink-0 border-t border-border/60 p-2.5 space-y-2">
          {!employee && (
          <div className={cn(footerCardClass, 'space-y-2')}>
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => void triggerStatusCheck()}
                className="min-w-0 flex-1 flex items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-accent/70 transition-colors"
                title="Обновить статус сервера"
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    online && 'bg-green-500',
                    checking && 'bg-green-500/50 animate-pulse',
                    !online && !checking && 'bg-destructive'
                  )}
                />
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {online ? 'Онлайн' : checking ? 'Проверка…' : 'Офлайн'}
                </span>
                <span className="h-3 w-px bg-border shrink-0" />
                <span
                  className="truncate font-mono text-[11px] text-muted-foreground"
                  title={modelTitle}
                >
                  {modelName}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleRefreshClick()}
                disabled={isRefreshing}
                className={cn(iconBtnClass, 'p-1.5 disabled:opacity-50')}
                title={isRefreshing ? 'Сканирование…' : 'Обновить модели'}
                aria-label={isRefreshing ? 'Сканирование моделей' : 'Обновить модели'}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </button>
            </div>

            <div className={cn('grid grid-cols-2 gap-x-3 gap-y-2', !online && 'opacity-60')}>
              <UsageMeter label="CPU" value={cpuValue} />
              <UsageMeter label="RAM" value={memoryValue} />
              {gpuSnapshots.map((gpu) => (
                <UsageMeter
                  key={gpu.key}
                  label={
                    <span className="inline-flex items-center gap-1">
                      <span className={cn('w-1.5 h-1.5 rounded-full opacity-70', gpuDotColor(gpu.index))} />
                      GPU {gpu.index}
                    </span>
                  }
                  value={gpu.utilization}
                />
              ))}
              <UsageMeter label="Диск" value={diskValue} />
            </div>
          </div>
          )}

          {employee && (
          <div className={cn(footerCardClass, 'flex items-center gap-2 min-w-0')}>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                online && 'bg-green-500',
                checking && 'bg-green-500/50 animate-pulse',
                !online && !checking && 'bg-destructive'
              )}
            />
            <span
              className="truncate font-mono text-[11px] text-muted-foreground"
              title={modelTitle}
            >
              {modelName}
            </span>
          </div>
          )}

          {user && (
            <div className={cn(footerCardClass, 'space-y-2')}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary text-xs font-semibold shrink-0">
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={userLabel}>
                    {userLabel}
                  </p>
                  {user.role !== 'user' && (
                    <p className="text-[10px] text-muted-foreground">{roleLabel(user.role)}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                {isAdmin(user) && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/admin');
                      closeIfMobile();
                    }}
                    aria-current={isRouteActive('/admin') ? 'page' : undefined}
                    className={cn(footerNavBtnClass(isRouteActive('/admin')), 'col-span-2')}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Админка
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigate('/profile');
                    closeIfMobile();
                  }}
                  aria-current={isRouteActive('/profile') ? 'page' : undefined}
                  className={footerNavBtnClass(isRouteActive('/profile'))}
                >
                  <UserRound className="w-3.5 h-3.5" />
                  {employee ? 'Аккаунт' : 'Профиль'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(clearChatList());
                    void dispatch(logout());
                  }}
                  className={footerNavBtnClass(false)}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
