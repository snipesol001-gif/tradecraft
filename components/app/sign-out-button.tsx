"use client";

// Sign out with a centered confirmation dialog. The dialog stays open
// until the user explicitly chooses Cancel or confirms. No auto-dismiss.

import { useState } from "react";
import { signOutUser } from "@/lib/auth";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOutUser();
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        Sign out
      </button>

      <ConfirmDialog
        open={open}
        title="Sign out of TradeCraft?"
        description="You will need to sign in again to reach your dashboard."
        confirmLabel="Yes, sign out"
        cancelLabel="Cancel"
        busy={busy}
        busyLabel="Signing out..."
        onConfirm={handleSignOut}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}