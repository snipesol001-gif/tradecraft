"use client";

// Reusable confirmation dialog. Centered, elevated, with entrance
// animation. Deliberately sticky: closes only on explicit Cancel or
// confirm. Clicking the overlay or pressing Escape does nothing, by
// design, so the choice is always explicit.

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <div className="fixed inset-0 z-50">
          <Dialog.Overlay className="fixed inset-0 bg-black/60 animate-[overlay-in_180ms_ease-out]" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-[dialog-in_200ms_ease-out] rounded-2xl border border-border bg-surface-raised p-6 shadow-raised focus:outline-none"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-bold tracking-tight text-text-primary">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-text-muted">
                {description}
              </Dialog.Description>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Button>
                            <Button className="flex-1" onClick={onConfirm} loading={busy}>
                {busy ? busyLabel ?? confirmLabel : confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}