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
  zIndex,
  'aria-label': ariaLabel,
}: SelectMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

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
        className={cn(fieldControlClass, 'w-full justify-between', triggerClassName)}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        minWidth={180}
        zIndex={zIndex}
        className="rounded-xl border-border bg-popover p-1 shadow-lg"
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
                    'flex w-full items-center gap-2 rounded-lg px-2.5 h-8 text-xs text-left transition-colors',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-foreground/80 hover:bg-accent/70 hover:text-foreground'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </MenuPopover>
    </div>
  );
}
