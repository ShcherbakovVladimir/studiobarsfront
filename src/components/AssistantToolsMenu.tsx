import React, { useRef, useState } from 'react';
import type { XlamToolDefinition } from '../services/agentService';
import { MenuPopover } from './ui/menu-popover';
import { celestia } from '../lib/celestia';
import { cn } from '../lib/utils';

interface AssistantToolsMenuProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  tools: XlamToolDefinition[];
  selectedNames: string[];
  onSelectedNamesChange: (names: string[]) => void;
  requireTools: boolean;
  onRequireToolsChange: (value: boolean) => void;
  disabled?: boolean;
}

function toolName(tool: XlamToolDefinition): string {
  return tool.function?.name ?? '';
}

export const AssistantToolsMenu: React.FC<AssistantToolsMenuProps> = ({
  enabled,
  onEnabledChange,
  tools,
  selectedNames,
  onSelectedNamesChange,
  requireTools,
  onRequireToolsChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedCount = selectedNames.length;
  const pickerLabel = selectedCount > 0 ? String(selectedCount) : String(tools.length || 0);
  const pickerTitle =
    selectedCount > 0
      ? `Выбрано инструментов: ${selectedCount} из ${tools.length}`
      : tools.length
        ? `Все доступные инструменты (${tools.length})`
        : 'Список инструментов';

  const toggleName = (name: string) => {
    if (selectedNames.includes(name)) {
      onSelectedNamesChange(selectedNames.filter((item) => item !== name));
      return;
    }
    onSelectedNamesChange([...selectedNames, name]);
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={enabled}
        title={enabled ? 'Инструменты включены — живой стрим отключён' : 'Инструменты выключены — живой стрим'}
        onClick={() => onEnabledChange(!enabled)}
        className={cn(
          'inline-flex items-center gap-1 h-8 px-2 rounded-xl text-xs transition-all duration-150 active:scale-95 disabled:opacity-40',
          enabled
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        Tools
        <span className="hidden @[48rem]/agentchat:inline">{enabled ? 'вкл' : 'выкл'}</span>
      </button>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-label="Список инструментов"
        title={pickerTitle}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-1 h-8 px-2 rounded-xl border text-xs transition-all duration-150 active:scale-95 disabled:opacity-40',
          open
            ? 'border-border bg-accent text-foreground'
            : 'border-border/70 bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border'
        )}
      >
        <span className="hidden @[36rem]/agentchat:inline">Список</span>
        <span className="min-w-[1.25rem] text-center font-medium tabular-nums">{pickerLabel}</span>
        <svg className="w-3 h-3 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        matchTriggerWidth={false}
        minWidth={260}
        zIndex={90}
      >
        <div className="px-3 py-2 text-xs font-medium text-foreground">Инструменты запроса</div>
        <p className="px-3 pb-2 text-[11px] text-muted-foreground leading-snug">
          Включённые tools уходят в <code>POST /api/chat</code>. Пустой набор = все доступные.
        </p>
        <label className={cn(celestia.headerMenuItem, 'cursor-pointer')}>
          <input
            type="checkbox"
            checked={requireTools}
            onChange={(event) => onRequireToolsChange(event.target.checked)}
            className="rounded"
          />
          Требовать вызов инструмента
        </label>
        <div className="max-h-56 overflow-y-auto py-1">
          {tools.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Нет доступных инструментов</div>
          )}
          {tools.map((tool) => {
            const name = toolName(tool);
            if (!name) return null;
            return (
              <label key={name} className={cn(celestia.headerMenuItem, 'cursor-pointer items-start')}>
                <input
                  type="checkbox"
                  checked={selectedNames.includes(name)}
                  onChange={() => toggleName(name)}
                  className="rounded mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block truncate">{name}</span>
                  {tool.function.description && (
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {tool.function.description}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </MenuPopover>
    </div>
  );
};
