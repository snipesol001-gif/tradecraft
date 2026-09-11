"use client";

// Step 1 of the reset flow. The success state is shown for ANY valid
// email, registered or not, so this screen cannot reveal which emails
// have accounts.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-sm leading-relaxed text-text-muted">
            If an account exists for <span className="font-medium text-text-primary break-all">{email}</span>,
            a 6-digit reset code has been sent. It expires in 15 minutes.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-2 text-xs text-text-faint">
              In development, the code also appears in the VS Code terminal.
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
        >
          I have the code, continue
        </Button>
      </div>
    );
  }

  return (
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

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={cooldown > 0}
      >
        {cooldown > 0 ? `Try again in ${cooldown}s` : loading ? "Sending..." : "Send reset code"}
      </Button>
    </form>
  );
}