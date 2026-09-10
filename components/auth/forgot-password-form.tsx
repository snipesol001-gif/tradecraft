"use client";

// Step 1 of the reset flow. Collects the email and requests a code.
// The success state is shown for ANY valid email, registered or not,
// so this screen cannot reveal which emails have accounts.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/ui/password-input";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (cooldown === 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
      } else if (data.error === "RATE_LIMITED" || data.error === "LOCKED") {
        setCooldown(data.retryAfterSeconds ?? 60);
        setError("Too many requests. Wait for the countdown, then try again.");
      } else if (data.error === "DAILY_LIMIT") {
        setError("Daily email limit reached. Please try again tomorrow.");
      } else {
        setError("Could not send the email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            If an account exists for <span className="font-medium break-all">{email}</span>,
            a 6-digit reset code has been sent. It expires in 15 minutes.
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
            In development, the code also appears in the VS Code terminal.
          </p>
        </div>
        <button
          onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
          className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90"
        >
          I have the code, continue
        </button>
      </div>
    );
  }

  return (
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

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || cooldown > 0}
        className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
      >
        {cooldown > 0 ? `Try again in ${cooldown}s` : loading ? "Sending..." : "Send reset code"}
      </button>
    </form>
  );
}