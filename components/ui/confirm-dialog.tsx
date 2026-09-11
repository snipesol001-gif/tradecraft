"use client";

// Reusable confirmation dialog. Centered with flexbox, where percentage
// widths have a definite base. One critical stacking rule: the overlay is
// position:fixed, so the Content must itself be positioned (relative) to
// paint above it. When the Content was static, the fixed overlay painted
// on top of the dialog, tinting it black and swallowing every click.
// z-10 makes the layering explicit. Sticky by design: Escape and outside
// clicks are ignored, only Cancel or confirm closes the dialog.

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Overlay className="fixed inset-0 bg-black/60 animate-[overlay-in_180ms_ease-out]" />
          <Dialog.Content
            className="relative z-10 w-full max-w-md animate-[dialog-pop_200ms_ease-out] rounded-2xl border border-border bg-surface-raised p-6 shadow-raised focus:outline-none sm:max-w-lg"
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
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">
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