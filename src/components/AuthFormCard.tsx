import React from 'react';
import { APP_NAME, BRAND_ART_SRC } from '../constants/brand';
import AuthThemeToggle from './auth/AuthThemeToggle';
import CelestiaBackground from './layout/CelestiaBackground';
import { StudioLogo } from './brand/StudioLogo';
import { authCardClass, authMutedClass, authPageClass } from './auth/authUi';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';

interface AuthFormCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBrandArt?: boolean;
}

const AuthFormCard: React.FC<AuthFormCardProps> = ({
  title,
  subtitle,
  children,
  footer,
  showBrandArt = false,
}) => (
  <div className={cn(celestia.page, authPageClass)}>
    <CelestiaBackground />
    <div className={authCardClass}>
      {showBrandArt && (
        <div className="relative h-44 sm:h-52 overflow-hidden">
          <img
            src={BRAND_ART_SRC}
            alt=""
            className="h-full w-full object-cover object-[center_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}
      <header className={cn(celestia.appHeaderBar, 'justify-between gap-2')}>
        <div className="flex items-center gap-2 min-w-0 px-1">
          <StudioLogo className="h-7 w-7" />
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold text-foreground leading-tight truncate">
              {APP_NAME}
            </span>
            <span className={cn(authMutedClass, 'block truncate')}>{title}</span>
          </span>
        </div>
        <AuthThemeToggle floating={false} />
      </header>
      <div className="p-4 sm:p-5 space-y-4 min-w-0">
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {children}
        {footer}
      </div>
    </div>
  </div>
);

export default AuthFormCard;
