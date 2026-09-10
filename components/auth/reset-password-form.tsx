"use client";

// Step 2 of the reset flow. Six-box code plus the new password, reusing
// the code input and the password input with the eye toggle. On success
// the server has already revoked every old session for this account.

import { useState } from "react";
import Link from "next/link";
import CodeInput from "@/components/ui/code-input";
import PasswordInput from "@/components/ui/password-input";

export default function ResetPasswordForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
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
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        return;
      }
      switch (data.error) {
        case "CODE_INCORRECT":
          setError(`Incorrect code. ${data.remainingAttempts} attempts remaining.`);
          setCode("");
          break;
        case "CODE_INVALIDATED":
          setError("Too many wrong attempts. This code is now invalid. Request a new one.");
          setCode("");
          break;
        case "CODE_EXPIRED":
          setError("That code has expired. Request a new one from the previous screen.");
          break;
        case "LOCKED":
          setError(
            `Too many attempts. Try again in ${Math.ceil((data.retryAfterSeconds ?? 900) / 60)} minutes.`
          );
          break;
        case "WEAK_PASSWORD":
          setError("That password is too weak. Use at least 8 characters.");
          break;
        default:
          setError("That code could not be used. Request a new one and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 p-4">
          <h2 className="font-semibold text-emerald-700 dark:text-emerald-400">
            Password updated
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            All previous sessions on every device were signed out for your
            protection.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90"
        >
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="email" value={email} />
      <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
        Reset code sent to <span className="break-all">{email}</span>
      </p>

      <CodeInput value={code} onChange={setCode} />

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium mb-1">
          New password
        </label>
        <PasswordInput
          id="new-password"
          required
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          required
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your new password"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}