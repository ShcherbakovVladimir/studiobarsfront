import { cn } from '../../lib/utils';
import { celestia } from '../../lib/celestia';

interface PanelCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelCard({ title, children, className }: PanelCardProps) {
  return (
    <div className={cn(celestia.card, 'p-5', className)}>
      {title && <h2 className="text-sm font-semibold mb-3 text-foreground font-display">{title}</h2>}
      {children}
    </div>
  );
}
