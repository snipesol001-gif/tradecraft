"use client";

// Reusable confirmation dialog. Centered modal, bold title, dimmed page
// behind it. Deliberately sticky: it closes only when the user clicks
// Cancel or the confirm button. Clicking the overlay or pressing Escape
// does nothing, by design, so the choice is always explicit.

import * as Dialog from "@radix-ui/react-dialog";

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
          <Dialog.Overlay className="fixed inset-0 bg-black/60" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl focus:outline-none dark:border-neutral-800 dark:bg-neutral-950"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <Dialog.Title className="text-lg font-bold tracking-tight">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {description}
              </Dialog.Description>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {busy ? busyLabel ?? "Working..." : confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}