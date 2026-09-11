"use client";

// Sign-up page with referral code field and required Terms acceptance.
// A referral or legal-recording problem never blocks signup itself: both
// are attempted after the account and session exist, failures are honest
// but non-fatal.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import AuthShell from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      setError("Please accept the Terms of Service to continue.");
      return;
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
    <AuthShell>
      <div className="mb-8">
        <p className="eyebrow">Get started</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Two minutes to set up. Free tier included.
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
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
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
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-text-primary">
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
          <label htmlFor="referral" className="mb-1.5 block text-sm font-medium text-text-primary">
            Referral code <span className="font-normal text-text-faint">(optional)</span>
          </label>
          <Input
            id="referral"
            type="text"
            autoComplete="off"
            maxLength={12}
            value={referral}
            onChange={(e) => setReferral(e.target.value.toUpperCase())}
            placeholder="From a friend's link"
          />
          {referralStatus === "VALID" && (
            <p className="mt-1 text-sm text-success">Valid referral code</p>
          )}
          {referralStatus === "INVALID" && (
            <p className="mt-1 text-sm text-warning">
              We could not find that code. You can continue without it.
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-neutral-900 dark:accent-white"
          />
          <span className="text-sm text-text-muted">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-medium underline underline-offset-4"
            >
              Terms of Service
            </Link>
            .
          </span>
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? "Creating account..." : "Create account"}
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
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}