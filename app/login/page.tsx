"use client";

// Sign-in page. Security note: unknown email and wrong password show the
// same message, so this form cannot reveal which emails have accounts.
// On success it starts a server session, attempts any pending referral
// capture (only meaningful for brand-new accounts), then enters the app.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import AuthShell from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PasswordInput from "@/components/ui/password-input";
import { attemptReferralCapture } from "@/lib/referral-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSession(idToken: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      throw new Error("Signed in, but the session could not start. Please try again.");
    }
  }

  async function enterApp() {
    await attemptReferralCapture();
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      const idToken = await user.getIdToken();
      await startSession(idToken);
      await enterApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();
      await startSession(idToken);
      await enterApp();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Sign in</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Pick up where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            Email
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-text-muted underline-offset-4 transition-colors hover:text-text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-faint">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle} disabled={loading}>
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-text-muted">
        New to TradeCraft?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}