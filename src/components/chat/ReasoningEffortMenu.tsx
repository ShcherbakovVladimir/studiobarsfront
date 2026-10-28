import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MenuPopover } from '../ui/menu-popover';
import {
  REASONING_EFFORT_LABELS,
  REASONING_EFFORTS,
  type ReasoningEffort,
} from '../../utils/reasoningEffort';

const EFFORT_LEVEL: Record<ReasoningEffort, number> = {
  xhigh: 4,
  medium: 3,
  low: 2,
  none: 0,
};

const EFFORT_HINT: Record<ReasoningEffort, string> = {
  xhigh: 'Глубокие рассуждения',
  medium: 'Баланс скорости и глубины',
  low: 'Короткие рассуждения',
  none: 'Без рассуждений',
};

function EffortBars({
  effort,
  className,
}: {
  effort: ReasoningEffort;
  className?: string;
}) {
  const level = EFFORT_LEVEL[effort];
  return (
    <span
      className={cn('inline-flex items-end gap-0.5 h-3.5 shrink-0', className)}
      aria-hidden
    >
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className={cn(
            'w-[3px] rounded-[1px] transition-colors',
            step === 1 && 'h-1.5',
            step === 2 && 'h-2',
            step === 3 && 'h-2.5',
            step === 4 && 'h-3.5',
            level === 0
              ? 'bg-muted-foreground/25'
              : step <= level
                ? 'bg-primary'
                : 'bg-muted-foreground/20'
          )}
        />
      ))}
    </span>
  );
}

interface ReasoningEffortMenuProps {
  value: ReasoningEffort;
  onChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
  className?: string;
  zIndex?: number;
}

export function ReasoningEffortMenu({
  value,
  onChange,
  disabled = false,
  className,
  zIndex = 140,
}: ReasoningEffortMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const label = useMemo(() => REASONING_EFFORT_LABELS[value], [value]);

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Усилие рассуждений"
        title="Фразу усилия печатает шаблон модели. Выкл — без рассуждений, как Instruct."
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors',
          'border-border bg-card text-foreground hover:bg-accent hover:border-primary/30',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          open && 'border-primary/40 bg-accent ring-2 ring-primary/20'
        )}
      >
        <EffortBars effort={value} />
        <span className="max-w-[5.5rem] truncate">{label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180 text-foreground'
          )}
        />
      </button>

      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        matchTriggerWidth={false}
        minWidth={220}
        align="end"
        zIndex={zIndex}
        className="rounded-lg border border-border bg-popover p-1.5 shadow-xl"
      >
        <div className="px-2.5 pt-1.5 pb-2 border-b border-border mb-1">
          <p className="text-[11px] font-medium text-foreground">Усилие рассуждений</p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
            Фразу подставляет шаблон модели
          </p>
        </div>
        <ul role="listbox" className="flex flex-col gap-0.5">
          {REASONING_EFFORTS.map((effort) => {
            const active = effort === value;
            return (
              <li key={effort}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(effort);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                      active
                        ? 'border-primary/35 bg-primary/10'
                        : 'border-border bg-card'
                    )}
                  >
                    <EffortBars effort={effort} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium leading-tight">
                      {REASONING_EFFORT_LABELS[effort]}
                    </span>
                    <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {EFFORT_HINT[effort]}
                    </span>
                  </span>
                  {active && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </MenuPopover>
    </div>
  );
}
