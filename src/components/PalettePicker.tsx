import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { setPalette } from '../store/appSlice';
import {
  PALETTE_IDS,
  PALETTE_LABELS,
  PALETTE_SWATCH,
  type PaletteId,
} from '../lib/palettes';
import { cn } from '../lib/utils';

interface PalettePickerProps {
  className?: string;
  /** compact = swatches only (sidebar); full = labeled grid (profile) */
  variant?: 'compact' | 'full';
}

export function PalettePicker({ className, variant = 'full' }: PalettePickerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const paletteId = useSelector((state: RootState) => state.app.paletteId);

  const pick = (id: PaletteId) => dispatch(setPalette(id));

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)} role="listbox" aria-label="Цветовая схема">
        {PALETTE_IDS.map((id) => {
          const active = id === paletteId;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              title={PALETTE_LABELS[id]}
              aria-label={PALETTE_LABELS[id]}
              onClick={() => pick(id)}
              className={cn(
                'h-5 w-5 rounded-full border transition-transform',
                active
                  ? 'scale-110 border-foreground ring-2 ring-foreground/25'
                  : 'border-border hover:scale-105'
              )}
              style={{ backgroundColor: PALETTE_SWATCH[id] }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-foreground">Цветовая схема</p>
      <p className="text-xs text-muted-foreground">
        {PALETTE_IDS.length} акцентов. Светлая/тёмная база переключается отдельно.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" role="listbox" aria-label="Цветовая схема">
        {PALETTE_IDS.map((id) => {
          const active = id === paletteId;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => pick(id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
                active
                  ? 'border-primary bg-accent'
                  : 'border-border hover:bg-muted'
              )}
            >
              <span
                className="h-6 w-full rounded-md"
                style={{ backgroundColor: PALETTE_SWATCH[id] }}
              />
              <span className="text-xs font-medium text-foreground">{PALETTE_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PalettePicker;
