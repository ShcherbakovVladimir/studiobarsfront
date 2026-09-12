import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Wrench,
  Mail,
  Database,
  ScrollText,
  Server,
  FlaskConical,
  Sparkles,
  ArrowLeft,
  Menu,
  X,
  Sun,
  Moon,
  MessageSquare,
  Files,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../../store/store';
import { toggleTheme } from '../../store/appSlice';
import { cn } from '../../lib/utils';
import CelestiaBackground from '../../components/layout/CelestiaBackground';
import { StudioLogo } from '../../components/brand/StudioLogo';
import { APP_NAME } from '../../constants/brand';
import { celestia } from '../../lib/celestia';

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }>;
}> = [
  {
    title: 'Управление',
    items: [
      { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
      { to: '/admin/users', label: 'Пользователи', icon: Users },
      { to: '/admin/chats', label: 'Чаты', icon: MessageSquare },
      { to: '/admin/sessions', label: 'RAG-сессии', icon: Files },
      { to: '/admin/audit', label: 'Аудит', icon: ScrollText },
    ],
  },
  {
    title: 'Конфигурация',
    items: [
      { to: '/admin/settings', label: 'Настройки', icon: Settings },
      { to: '/admin/maintenance', label: 'Техработы', icon: Wrench },
      { to: '/admin/mail', label: 'Почта', icon: Mail },
      { to: '/admin/backups', label: 'Бэкапы', icon: Database },
    ],
  },
  {
    title: 'Система',
    items: [
      { to: '/admin/system', label: 'Система', icon: Server },
      { to: '/admin/inference-lab', label: 'Инференс', icon: Sparkles },
      { to: '/admin/api-tester', label: 'Тест API', icon: FlaskConical },
    ],
  },
];

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

const iconBtnClass = cn(
  'p-1.5 rounded-xl transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
  'text-foreground/70 hover:text-foreground hover:bg-accent/70'
);

const footerCardClass =
  'rounded-2xl border border-border/60 bg-accent/25 dark:bg-accent/15 px-2.5 py-2';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);
  const user = useSelector((state: RootState) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userLabel = user?.displayName || user?.email || '';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={cn(celestia.page, 'relative h-dvh overflow-hidden')}>
      <CelestiaBackground />
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-500 ease-out',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-dvh w-64 flex-col',
          celestia.sidebar,
          'text-foreground',
          '[&_a]:text-inherit [&_a:hover]:text-inherit',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0',
          sidebarOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
        )}
      >
        <div className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
          <div className="flex items-center gap-2 min-w-0 px-1">
            <StudioLogo className="h-7 w-7 shrink-0" />
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-foreground leading-tight truncate">
                Админ-панель
              </span>
              <span className="block text-[10px] text-muted-foreground leading-tight truncate">
                {userLabel || APP_NAME}
              </span>
            </span>
          </div>
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className={iconBtnClass}
              title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
              aria-label={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={closeSidebar}
              className={cn(iconBtnClass, 'md:hidden')}
              aria-label="Закрыть меню"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={closeSidebar}
                    className={({ isActive }) => navItemClass(isActive)}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate tracking-tight">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border/60 p-2.5">
          <div className={footerCardClass}>
            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              В приложение
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 md:pl-64 h-dvh overflow-hidden flex flex-col relative page-enter">
        <header className={cn('md:hidden sticky top-0 z-30', celestia.mobileHeader, celestia.appHeaderBar)}>
          <div className="flex items-center gap-2 w-full min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-xl transition-colors"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>
            <StudioLogo className="h-7 w-7" />
            <span className="text-sm font-semibold truncate text-foreground">Админ-панель</span>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
