"use client";

// TEMPORARY one-time bootstrap page: sets the initial admin password on
// a Google-only owner account after a fresh sign-in. Deleted after use.
// The password is typed here and sent directly to the server; it never
// appears in chat or console logs.

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminBootstrapPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [authAge, setAuthAge] = useState<number | null>(null);

  useEffect(() => {
    // Wait for Firebase to finish restoring the auth state before
    // deciding anything. auth.currentUser is null during early load.
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        setAuthError("Not signed in. Sign in with Google, then return here immediately.");
        setChecking(false);
        return;
      }
      try {
        const idToken = await user.getIdToken(true);
        const decoded = JSON.parse(atob(idToken.split(".")[1]));
        const authTimeMs = typeof decoded.auth_time === "number" ? decoded.auth_time * 1000 : 0;
        setAuthAge(authTimeMs);
        setToken(idToken);
      } catch {
        setAuthError("Could not verify your sign-in. Sign in again and retry.");
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, []);

  const fresh = authAge !== null && Date.now() - authAge < 10 * 60 * 1000;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/auth/set-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResult({
          ok: true,
          text: "Password set. You can now log in to the admin console with your email and this password.",
        });
      } else {
        setResult({ ok: false, text: data?.error ?? "Password setup failed." });
      }
    } catch {
      setResult({ ok: false, text: "Password setup failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow">One-time setup</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Set the admin password
        </h1>

        {checking ? (
          <p className="mt-6 text-sm text-text-muted">Checking your sign-in...</p>
        ) : authError ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-danger">{authError}</p>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Go to sign in
              </Button>
            </Link>
          </div>
        ) : !token ? (
          <p className="mt-6 text-sm text-text-muted">Verifying your sign-in...</p>
        ) : !fresh ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-danger">
              Your sign-in is too old for this sensitive action. Sign out,
              sign in with Google again, and return here immediately.
            </p>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Go to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm text-success">Fresh sign-in verified.</p>
            <div>
              <label htmlFor="np" className="mb-1.5 block text-sm font-medium text-text-primary">
                New admin password
              </label>
              <Input
                id="np"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="cp" className="mb-1.5 block text-sm font-medium text-text-primary">
                Confirm password
              </label>
              <Input
                id="cp"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {result && (
              <p className={result.ok ? "text-sm text-success" : "text-sm text-danger"}>
                {result.text}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Set admin password
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}