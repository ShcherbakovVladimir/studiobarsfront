import { APP_NAME, BRAND_ART_SRC } from '../../constants/brand';
import { cn } from '../../lib/utils';

interface StudioLogoProps {
  className?: string;
  title?: string;
}

export function StudioLogo({ className, title = APP_NAME }: StudioLogoProps) {
  return (
    <img
      src={BRAND_ART_SRC}
      alt={title}
      title={title}
      className={cn('studio-logo shrink-0 rounded-xl object-cover', className)}
    />
  );
}

export default StudioLogo;
