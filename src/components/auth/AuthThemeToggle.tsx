import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import type { AppDispatch, RootState } from '../../store/store';
import { toggleTheme } from '../../store/appSlice';
import { cn } from '../../lib/utils';

interface AuthThemeToggleProps {
  floating?: boolean;
  className?: string;
}

const AuthThemeToggle: React.FC<AuthThemeToggleProps> = ({ floating = true, className }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useSelector((state: RootState) => state.app.isDarkMode);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors',
        floating && 'fixed top-3 right-3 z-50 glass-panel shadow-sm',
        className
      )}
      title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
      aria-label={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
    >
      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export default AuthThemeToggle;
