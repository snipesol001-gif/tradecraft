"use client";

// Ends every admin session for this owner. The current tab included:
// the owner re-opens the console from /admin-login afterwards.

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function EndSessionsButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function endAll() {
    setBusy(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      setDone(true);
      setTimeout(() => {
        window.location.href = "/admin-login";
      }, 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        onClick={endAll}
        disabled={busy || done}
      >
        {done ? "Sessions ended" : busy ? "Ending..." : "End all admin sessions"}
      </Button>
      {done && (
        <p className="mt-2 text-xs text-neutral-500">
          Returning to the console entry...
        </p>
      )}
    </div>
  );
}