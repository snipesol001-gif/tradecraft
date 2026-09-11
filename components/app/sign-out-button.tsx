"use client";

// Sign out with a centered confirmation dialog. The dialog stays open
// until the user explicitly chooses Cancel or confirms. No auto-dismiss.

import { useState } from "react";
import { signOutUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        Sign out
      </Button>

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