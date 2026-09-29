import React, { useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { MenuPopover } from './ui/menu-popover';
import { formatTokens, usageRatio, type ContextUsage } from '../utils/contextUsage';

interface ContextUsageRingProps {
  usage: ContextUsage | null | undefined;
  limitMessage?: string | null;
  streaming?: boolean;
}

const RING_SIZE = 18;
const RING_STROKE = 2.5;

function toneFor(ratio: number | null, limited: boolean): string {
  if (limited || (ratio !== null && ratio >= 0.9)) return 'text-destructive';
  if (ratio !== null && ratio >= 0.7) return 'text-amber-500';
  return 'text-foreground/70';
}

function fullNumber(value: number | null): string {
  return value === null ? '—' : Math.round(value).toLocaleString('ru-RU');
}

function Ring({ ratio, className }: { ratio: number | null; className?: string }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = ratio === null ? 0 : Math.max(ratio, ratio > 0 ? 0.02 : 0) * circumference;
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className={cn('-rotate-90', className)}
      aria-hidden="true"
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={RING_STROKE}
        strokeDasharray={ratio === null ? '2 2' : undefined}
      />
      {ratio !== null && (
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none"
        />
      )}
    </svg>
  );
}

interface Segment {
  key: string;
  label: string;
  value: number | null;
  className: string;
}

function buildSegments(usage: ContextUsage): Segment[] {
  const generated = usage.tokensGenerated;
  const hasSplit = usage.tokensCached !== null && usage.tokensEvaluated !== null;
  const prompt =
    usage.tokensPrompt ??
    (usage.tokensTotal !== null && generated !== null ? usage.tokensTotal - generated : null);
  const promptSegments: Segment[] = hasSplit
    ? [
        { key: 'cached', label: 'Промпт из кэша слота', value: usage.tokensCached, className: 'bg-sky-500/60' },
        { key: 'evaluated', label: 'Промпт посчитан заново', value: usage.tokensEvaluated, className: 'bg-sky-500' },
      ]
    : [{ key: 'prompt', label: 'Промпт', value: prompt, className: 'bg-sky-500' }];
  return [
    ...promptSegments,
    { key: 'generated', label: 'Ответ модели', value: generated, className: 'bg-emerald-500' },
  ];
}

export function ContextUsageRing({ usage, limitMessage, streaming = false }: ContextUsageRingProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const limited = Boolean(limitMessage);
  const ratio = limited && usageRatio(usage) === null ? 1 : usageRatio(usage);
  const percent = ratio === null ? null : Math.round(ratio * 100);
  const tone = toneFor(ratio, limited);

  const title =
    percent === null
      ? 'Контекст: счётчик появится после первого ответа'
      : `Контекст: ${percent}% · ${formatTokens(usage?.tokensTotal ?? null)} из ${formatTokens(usage?.contextSize ?? null)}`;

  const segments = usage ? buildSegments(usage) : [];
  const size = usage?.contextSize ?? null;
  const free = size !== null && usage?.tokensTotal != null ? Math.max(0, size - usage.tokensTotal) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={title}
        aria-expanded={open}
        title={title}
        className={cn(
          'shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors',
          tone
        )}
      >
        <Ring ratio={ratio} />
      </button>

      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        minWidth={288}
        matchTriggerWidth={false}
        align="end"
        className="p-0"
      >
        <div className="p-3.5 space-y-3 text-foreground">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ring ratio={ratio} className={tone} />
              <span className="text-sm font-medium">Контекстное окно</span>
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', tone)}>
              {percent === null ? '—' : `${percent}%`}
            </span>
          </div>

          {!usage ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Счётчик появится после первого ответа модели в этом чате.
            </p>
          ) : (
            <>
              <div className="text-xs text-muted-foreground tabular-nums">
                <span className="text-foreground font-medium">{fullNumber(usage.tokensTotal)}</span>
                {' из '}
                {fullNumber(size)} токенов занято
              </div>

              {size !== null && size > 0 && (
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {segments.map((segment) =>
                    segment.value !== null && segment.value > 0 ? (
                      <div
                        key={segment.key}
                        className={cn('h-full', segment.className)}
                        style={{ width: `${Math.min(100, (segment.value / size) * 100)}%` }}
                      />
                    ) : null
                  )}
                </div>
              )}

              <dl className="space-y-1.5 text-xs">
                {segments.map((segment) => (
                  <div key={segment.key} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <span className={cn('h-2 w-2 rounded-full', segment.className)} />
                      {segment.label}
                    </dt>
                    <dd className="tabular-nums">{fullNumber(segment.value)}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    Свободно
                  </dt>
                  <dd className="tabular-nums">{fullNumber(free)}</dd>
                </div>
              </dl>

              <dl className="space-y-1.5 border-t border-border/60 pt-2.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Весь промпт</dt>
                  <dd className="tabular-nums">{fullNumber(usage.tokensPrompt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Занято после ответа</dt>
                  <dd className="tabular-nums">{fullNumber(usage.tokensTotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Окно слота</dt>
                  <dd className="tabular-nums">{fullNumber(size)}</dd>
                </div>
              </dl>
            </>
          )}

          {limited ? (
            <p className="rounded-xl bg-destructive/10 px-2.5 py-2 text-xs text-destructive leading-relaxed">
              {limitMessage}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {streaming
                ? 'Идёт генерация — счётчик обновится, когда ответ завершится.'
                : usage
                  ? `По последнему ответу · ${new Date(usage.updatedAt).toLocaleTimeString('ru-RU')}`
                  : 'Данные присылает сервер вместе с ответом.'}
            </p>
          )}
        </div>
      </MenuPopover>
    </>
  );
}
