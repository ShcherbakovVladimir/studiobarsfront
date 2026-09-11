import { cn } from '../../lib/utils';

interface StudioLogoProps {
  className?: string;
  title?: string;
}

/** Inverts with theme: dark mark on light, light mark on dark. */
export function StudioLogo({ className, title = 'Студия xLAM' }: StudioLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('studio-logo shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect className="logo-plate" width="32" height="32" rx="9" />
      <g className="logo-ink" transform="translate(16 16)">
        <rect x="-11" y="-1.65" width="22" height="3.3" rx="1.65" transform="rotate(45)" />
        <rect x="-11" y="-1.65" width="22" height="3.3" rx="1.65" transform="rotate(-45)" />
        <circle r="4.1" />
        <circle className="logo-plate" r="1.7" />
      </g>
    </svg>
  );
}

export default StudioLogo;
