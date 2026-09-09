"use client";

// Sign-in page. Security note: unknown email and wrong password show the
// same message, so this form cannot reveal which emails have accounts.

import { useState } from "react";
import Link from "next/link";
import { signInWithEmail, signInWithGoogle, signOutUser } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import PasswordInput from "@/components/ui/password-input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      setSignedInEmail(user.email);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      setSignedInEmail(user.email);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    setSignedInEmail(null);
    setEmail("");
    setPassword("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TradeCraft
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Welcome back.
          </p>
        </div>

        {signedInEmail ? (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center">
            <h2 className="font-semibold">Signed in</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              You are signed in as {signedInEmail}.
            </p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              The session system and dashboard redirect arrive in the next build steps.
            </p>
            <button
              onClick={handleSignOut}
              className="mt-4 w-full rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
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
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-xs text-neutral-500">or</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            >
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              New to TradeCraft?{" "}
              <Link href="/signup" className="font-medium underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}