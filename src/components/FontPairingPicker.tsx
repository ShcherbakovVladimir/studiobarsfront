import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { setFontPairing, setHighContrast } from '../store/appSlice';
import {
  FONT_PAIRING_IDS,
  FONT_PAIRING_LABELS,
  type FontPairingId,
} from '../lib/fonts';
import { cn } from '../lib/utils';

interface FontPairingPickerProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function FontPairingPicker({ className, variant = 'full' }: FontPairingPickerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const fontPairingId = useSelector((state: RootState) => state.app.fontPairingId);
  const highContrast = useSelector((state: RootState) => state.app.highContrast);

  const pick = (id: FontPairingId) => dispatch(setFontPairing(id));

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-1', className)} role="listbox" aria-label="Шрифтовая пара">
        {FONT_PAIRING_IDS.map((id) => {
          const active = id === fontPairingId;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              title={FONT_PAIRING_LABELS[id]}
              onClick={() => pick(id)}
              className={cn(
                'h-8 px-2 rounded-md text-[10px] border transition-colors touch-target-inline',
                active
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {id.slice(0, 3)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-sm font-medium text-foreground">Шрифтовая пара</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Правило 2+1: дисплей + чтение + моно.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="listbox" aria-label="Шрифтовая пара">
        {FONT_PAIRING_IDS.map((id) => {
          const active = id === fontPairingId;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => pick(id)}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors touch-target-inline',
                active ? 'border-primary bg-accent' : 'border-border hover:bg-muted'
              )}
            >
              <span className="block text-sm font-medium font-display">{FONT_PAIRING_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer touch-target-inline">
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => dispatch(setHighContrast(e.target.checked))}
          className="rounded border-border"
        />
        Высокий контраст
      </label>
    </div>
  );
}

export default FontPairingPicker;
