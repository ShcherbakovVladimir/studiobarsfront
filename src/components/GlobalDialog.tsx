import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  dismissDialog,
  resolveDialog,
  subscribeDialogs,
  type DialogRequest,
} from '../services/dialogService';

const GlobalDialog: React.FC = () => {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeDialogs(setRequest), []);

  if (!request) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissDialog(request.id);
    }
  };

  const handleConfirm = () => {
    if (request.kind === 'prompt') {
      resolveDialog(request.id, promptInputRef.current?.value ?? '');
      return;
    }
    if (request.kind === 'confirm') {
      resolveDialog(request.id, true);
      return;
    }
    resolveDialog(request.id);
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        key={request.id}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => dismissDialog(request.id)}
      >
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          {request.description && (
            <DialogDescription className="whitespace-pre-wrap">{request.description}</DialogDescription>
          )}
        </DialogHeader>

        {request.kind === 'prompt' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            <input
              id="global-dialog-prompt"
              name="prompt"
              key={request.id}
              ref={promptInputRef}
              type={request.inputType ?? 'text'}
              defaultValue={request.defaultValue ?? ''}
              placeholder={request.placeholder}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              autoFocus
              autoComplete={request.inputType === 'password' ? 'new-password' : 'off'}
            />
          </form>
        )}

        <DialogFooter>
          {request.kind !== 'alert' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => dismissDialog(request.id)}
            >
              {request.cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            variant={request.kind === 'confirm' && request.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {request.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalDialog;
