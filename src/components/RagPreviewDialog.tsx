import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface RagPreviewDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const RagPreviewDialog: React.FC<RagPreviewDialogProps> = ({
  open,
  title,
  description,
  onClose,
  children,
}) => (
  <Dialog
    open={open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}
  >
    <DialogContent className="flex h-[min(92vh,56rem)] w-[min(96vw,72rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:rounded-3xl">
      <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 pr-12 text-left">
        <DialogTitle className="truncate text-base sm:text-lg">{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </DialogContent>
  </Dialog>
);

export default RagPreviewDialog;
