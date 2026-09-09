"use client";

// Sign-up page. Creates a TradeCraft account through Firebase Authentication.
// On success the user is automatically signed in on this browser (Firebase default),
// shown honestly in the success card.

import { useState } from "react";
import Link from "next/link";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import PasswordInput from "@/components/ui/password-input";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const user = await signUpWithEmail(email, password);
      setSuccessEmail(user.email);
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
      setSuccessEmail(user.email);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TradeCraft
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Find work. Share work. Get hired.
          </p>
        </div>

        {successEmail ? (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center">
            <h2 className="font-semibold">Account created</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              You are signed in as {successEmail}.
            </p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              Email verification and onboarding arrive in the next build steps.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
            >
              Back to homepage
            </Link>
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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-1">
                  Confirm password
                </label>
                <PasswordInput
                  id="confirm"
                  required
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
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
                {loading ? "Creating account..." : "Create account"}
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
              Already have an account?{" "}
              <Link href="/login" className="font-medium underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}