import React from 'react';

interface ChatMessageToolbarProps {
  canEdit: boolean;
  canRegenerate: boolean;
  canFork: boolean;
  disabled: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onFork: () => void;
}

const ChatMessageToolbar: React.FC<ChatMessageToolbarProps> = ({
  canEdit,
  canRegenerate,
  canFork,
  disabled,
  onCopy,
  onSpeak,
  onEdit,
  onRegenerate,
  onFork,
}) => (
  <div className="mt-1 flex flex-wrap gap-1 opacity-80">
    <ToolbarButton label="Копировать" disabled={disabled} onClick={onCopy} />
    <ToolbarButton label="Озвучить" disabled={disabled} onClick={onSpeak} />
    {canEdit && <ToolbarButton label="Править" disabled={disabled} onClick={onEdit} />}
    {canRegenerate && <ToolbarButton label="Повторить" disabled={disabled} onClick={onRegenerate} />}
    {canFork && <ToolbarButton label="Ветка" disabled={disabled} onClick={onFork} />}
  </div>
);

function ToolbarButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export default ChatMessageToolbar;
