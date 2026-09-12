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
        disabled={disabled || !enabled}
        aria-expanded={open}
        aria-label="Список инструментов"
        title="Выбрать инструменты"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          celestia.headerIcon,
          'text-xs',
          open && 'bg-accent text-foreground',
          (!enabled || disabled) && 'opacity-40'
        )}
      >
        {enabled ? selectedCount : '·'}
      </button>
      <MenuPopover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        matchTriggerWidth={false}
        minWidth={260}
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
