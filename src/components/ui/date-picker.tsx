import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MenuPopover, fieldControlClass } from './menu-popover';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function parseIso(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGrid(view: Date): Array<Date | null> {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const weekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: weekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(view.getFullYear(), view.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Дата',
  className,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? new Date());
  const today = useMemo(() => new Date(), []);
  const cells = useMemo(() => monthGrid(view), [view]);
  const label = selected
    ? selected.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder;

  const openMenu = () => {
    setView(selected ?? new Date());
    setOpen(true);
  };

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(fieldControlClass, 'w-full justify-between')}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>{label}</span>
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      </button>
      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        minWidth={260}
        matchTriggerWidth={false}
        className="p-2"
      >
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <button
            type="button"
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs font-medium capitalize">
            {view.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </p>
          <button
            type="button"
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            aria-label="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-0.5 mb-1">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-[10px] text-center text-muted-foreground py-1">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-0.5">
          {cells.map((date, index) => {
            if (!date) {
              return <span key={`empty-${index}`} className="h-8" />;
            }
            const isSelected = selected ? sameDay(date, selected) : false;
            const isToday = sameDay(date, today);
            return (
              <button
                key={toIso(date)}
                type="button"
                onClick={() => {
                  onChange(toIso(date));
                  setOpen(false);
                }}
                className={cn(
                  'h-8 rounded-xl text-xs transition-colors',
                  isSelected && 'bg-primary/15 text-foreground font-medium',
                  !isSelected && isToday && 'border border-border text-foreground',
                  !isSelected && !isToday && 'text-foreground/80 hover:bg-accent'
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 px-0.5">
          <button
            type="button"
            className="h-7 px-2.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="h-7 px-2.5 rounded-lg text-xs hover:bg-accent"
            onClick={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
          >
            Сегодня
          </button>
        </div>
      </MenuPopover>
    </div>
  );
}
