import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MenuPopover, fieldControlClass } from './menu-popover';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  zIndex?: number;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function SelectMenu({
  id,
  value,
  onChange,
  options,
  placeholder = 'Выбрать',
  className,
  triggerClassName,
  disabled = false,
  zIndex = 140,
  size = 'md',
  'aria-label': ariaLabel,
}: SelectMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );
  const compact = size === 'sm';

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          fieldControlClass,
          'w-full justify-between',
          compact && 'h-8 rounded-xl px-3 text-xs',
          open && 'ring-2 ring-ring/30',
          triggerClassName
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200',
            compact && 'w-3.5 h-3.5',
            open && 'rotate-180'
          )}
        />
      </button>
      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        minWidth={180}
        zIndex={zIndex}
        className="rounded-2xl border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 shadow-2xl"
      >
        <ul role="listbox" className="max-h-64 overflow-y-auto overflow-x-hidden scroll-clip py-0.5">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 text-left transition-colors',
                    compact ? 'h-8 text-xs' : 'h-9 text-sm',
                    active
                      ? 'bg-accent text-foreground font-medium shadow-sm'
                      : 'text-foreground/80 hover:bg-accent/70 hover:text-foreground'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                      <Check className="w-3 h-3" />
                    </span>
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
