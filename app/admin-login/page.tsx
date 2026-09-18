"use client";

// The admin console entry. Completely separate visual identity from the
// user application, by design. Requires a signed-in owner session; the
// console opens with one action. Non-owners are refused honestly.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const [state, setState] = useState<"checking" | "refused" | "ready">("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/login", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          window.location.href = "/admin";
          return;
        }
        setState("refused");
        setError(data?.error ?? "Access refused.");
      } catch {
        setState("refused");
        setError("Could not reach the admin service.");
      }
    })();
  }, []);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        window.location.href = "/admin";
        return;
      }
      setError(data?.error ?? "Access refused.");
    } catch {
      setError("Could not reach the admin service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100">
          <ShieldCheck size={26} />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          TradeCraft
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-100">
          Admin Console
        </h1>

        {state === "checking" && (
          <p className="mt-6 text-sm text-neutral-400">Verifying access...</p>
        )}

        {state === "refused" && (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
              {error}
            </p>
            <Link
              href="/login"
              className="block text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
            >
              Sign in to TradeCraft first
            </Link>
            <Button variant="secondary" className="w-full" onClick={retry} loading={busy}>
              Retry
            </Button>
          </div>
        )}

        <p className="mt-10 text-xs text-neutral-600">
          Access is limited to the owner account. All actions are audited.
        </p>
      </div>
    </main>
  );
}