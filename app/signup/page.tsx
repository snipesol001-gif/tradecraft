"use client";

// Sign-up page with referral code field and required legal acceptance.
// A referral or legal-recording problem never blocks signup itself: both
// are attempted after the account and session exist, and failures are
// honest but non-fatal.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import PasswordInput from "@/components/ui/password-input";
import { getStoredRef, attemptReferralCapture } from "@/lib/referral-client";
import { TERMS_VERSION } from "@/lib/legal-content";

type ReferralStatus = "IDLE" | "CHECKING" | "VALID" | "INVALID";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referral, setReferral] = useState("");
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>("IDLE");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getStoredRef();
    if (stored) setReferral(stored);
  }, []);

  useEffect(() => {
    const code = referral.trim().toUpperCase();
    if (!code) {
      setReferralStatus("IDLE");
      return;
    }
    setReferralStatus("CHECKING");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/referral/check?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        setReferralStatus(data.valid ? "VALID" : "INVALID");
      } catch {
        setReferralStatus("IDLE");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [referral]);

  async function startSession(idToken: string) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      throw new Error("Account created, but the session could not start. Please sign in.");
    }
  }

  async function afterAccountReady(idToken: string, referralCode: string) {
    await startSession(idToken);
    // Record legal acceptance. Best-effort: if it fails, the account still
    // works and acceptance can be re-confirmed at onboarding (a later step).
    try {
      await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: "terms", version: TERMS_VERSION }),
      });
    } catch {
      // non-fatal
    }
    await attemptReferralCapture(referralCode || undefined);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accepted) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }
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
      const idToken = await user.getIdToken();
      await afterAccountReady(idToken, referral.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    if (!accepted) {
      setError("Please accept the Terms of Service to continue.");      return;
    }
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();
      await afterAccountReady(idToken, referral.trim());
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
          <div>
            <label htmlFor="referral" className="block text-sm font-medium mb-1">
              Referral code (optional)
            </label>
            <input
              id="referral"
              type="text"
              autoComplete="off"
              maxLength={12}
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="From a friend's link"
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            {referralStatus === "VALID" && (
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                Valid referral code
              </p>
            )}
            {referralStatus === "INVALID" && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                We could not find that code. You can continue without it.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-neutral-900 dark:accent-white"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline underline-offset-4 font-medium"
              >
                Terms of Service
              </Link>
              .
            </span>
          </label>

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
      </div>
    </main>
  );
}