import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleSlash,
  FilePen,
  FilePlus2,
  FileX2,
  Loader2,
  RefreshCcw,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { celestia } from '../../lib/celestia';
import { ChatMarkdown, StreamingChatMarkdown } from '../markdown/ChatMarkdown';
import { splitThinkingContent } from '../../utils/thinkingContent';
import type { WorkspaceChange, WorkspaceStep } from '../../services/workspaceService';
import {
  changeLabel,
  mergeChanges,
  stepLabel,
  type FeedConfirmation,
  type FeedMessage,
} from './workspaceModel';

interface WorkspaceTaskFeedProps {
  messages: FeedMessage[];
  isDarkMode: boolean;
  onOpenFile: (path: string) => void;
  onResolve: (messageId: string, confirmation: FeedConfirmation, approve: boolean) => void;
}

function StepIcon({ step }: { step: WorkspaceStep }) {
  if (step.phase === 'start') return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  if (step.confirmationRequired) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  if (step.success === false) return <X className="h-3.5 w-3.5 text-destructive" />;
  return <Check className="h-3.5 w-3.5 text-emerald-500" />;
}

const COLLAPSE_AFTER = 6;

function StepList({ steps, streaming }: { steps: WorkspaceStep[]; streaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (steps.length === 0) return null;
  const hidden = !expanded && !streaming && steps.length > COLLAPSE_AFTER ? steps.length - COLLAPSE_AFTER : 0;
  const visible = hidden ? steps.slice(-COLLAPSE_AFTER) : steps;
  return (
    <div className="mb-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2">
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="h-3 w-3" /> Ещё шагов: {hidden}
        </button>
      )}
      <ol className="space-y-1">
        {visible.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-xs leading-relaxed">
            <span className="mt-0.5 shrink-0">
              <StepIcon step={step} />
            </span>
            <span className={cn('min-w-0 break-words', step.success === false ? 'text-destructive' : 'text-foreground/80')}>
              {stepLabel(step)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const CHANGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  created: FilePlus2,
  edited: FilePen,
  overwritten: RefreshCcw,
  deleted: FileX2,
};

function ChangeList({ changes, onOpenFile }: { changes: WorkspaceChange[]; onOpenFile: (path: string) => void }) {
  const merged = mergeChanges(changes);
  if (merged.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Что изменилось в папке
      </p>
      <ul className="space-y-0.5">
        {merged.map((change) => {
          const Icon = CHANGE_ICON[change.action] ?? FilePen;
          const deleted = change.action === 'deleted';
          return (
            <li key={change.path} className="flex items-center gap-2 text-sm">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', deleted ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')} />
              {deleted ? (
                <span className="min-w-0 truncate line-through opacity-70">{change.path}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenFile(change.path)}
                  className="min-w-0 truncate text-left font-medium text-primary hover:underline"
                >
                  {change.path}
                </button>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">{changeLabel(change)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfirmationCard({
  confirmation,
  onResolve,
}: {
  confirmation: FeedConfirmation;
  onResolve: (approve: boolean) => void;
}) {
  const destructive = confirmation.action === 'delete';
  const approveLabel = destructive ? 'Удалить' : 'Заменить';
  const settled = confirmation.state !== 'pending' && confirmation.state !== 'busy';
  const outcome =
    confirmation.state === 'approved'
      ? destructive
        ? 'Файл удалён'
        : 'Файл заменён'
      : confirmation.state === 'rejected'
        ? 'Отменено — файл не тронут'
        : confirmation.state === 'expired'
          ? 'Запрос устарел — попросите модель повторить'
          : null;

  return (
    <div
      className={cn(
        'mt-3 rounded-2xl border px-3 py-2.5',
        settled
          ? 'border-border/60 bg-muted/30'
          : destructive
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-amber-500/40 bg-amber-500/5'
      )}
    >
      <div className="flex items-start gap-2">
        {settled ? (
          confirmation.state === 'approved' ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', destructive ? 'text-destructive' : 'text-amber-500')} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm">{confirmation.message}</p>
          {confirmation.path && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{confirmation.path}</p>}
          {outcome && <p className="mt-1 text-xs text-muted-foreground">{outcome}</p>}
        </div>
      </div>
      {!settled && (
        <div className="mt-2.5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={confirmation.state === 'busy'}
            onClick={() => onResolve(false)}
            className="h-8 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={confirmation.state === 'busy'}
            onClick={() => onResolve(true)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium disabled:opacity-50',
              destructive ? 'bg-destructive text-white hover:bg-destructive/90' : 'btn-gradient'
            )}
          >
            {confirmation.state === 'busy' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {approveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({
  message,
  isDarkMode,
  onOpenFile,
  onResolve,
}: {
  message: FeedMessage;
  isDarkMode: boolean;
  onOpenFile: (path: string) => void;
  onResolve: WorkspaceTaskFeedProps['onResolve'];
}) {
  const { answer, hasThinkingBlock, isThinkingComplete } = splitThinkingContent(message.content);
  const streaming = Boolean(message.streaming);
  const thinking = streaming && hasThinkingBlock && !isThinkingComplete;
  const working = streaming && !answer;
  const runningStep = message.steps?.some((step) => step.phase === 'start');

  return (
    <div className={celestia.chatBubbleAi}>
      <StepList steps={message.steps ?? []} streaming={streaming} />
      {answer &&
        (streaming ? (
          <StreamingChatMarkdown content={answer} isDarkMode={isDarkMode} />
        ) : (
          <ChatMarkdown content={answer} isDarkMode={isDarkMode} />
        ))}
      {working && !runningStep && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {thinking ? 'Думаю над задачей…' : 'Работаю…'}
        </p>
      )}
      {(message.confirmations ?? []).map((confirmation) => (
        <ConfirmationCard
          key={confirmation.confirmationId}
          confirmation={confirmation}
          onResolve={(approve) => onResolve(message.id, confirmation, approve)}
        />
      ))}
      {!streaming && <ChangeList changes={message.changes ?? []} onOpenFile={onOpenFile} />}
      {message.error && (
        <p className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {message.error}
        </p>
      )}
      {message.interrupted && !streaming && (
        <p className="mt-2 text-xs text-muted-foreground">
          Остановлено. Файлы, которые модель успела записать, остались в папке.
        </p>
      )}
    </div>
  );
}

export const WorkspaceTaskFeed = React.memo(function WorkspaceTaskFeed({
  messages,
  isDarkMode,
  onOpenFile,
  onResolve,
}: WorkspaceTaskFeedProps) {
  return (
    <div className="space-y-5">
      {messages.map((message) =>
        message.role === 'user' ? (
          <div key={message.id} className="flex justify-end">
            <div className={cn(celestia.chatBubbleUser, 'whitespace-pre-wrap')}>{message.content}</div>
          </div>
        ) : (
          <AssistantMessage
            key={message.id}
            message={message}
            isDarkMode={isDarkMode}
            onOpenFile={onOpenFile}
            onResolve={onResolve}
          />
        )
      )}
    </div>
  );
});
