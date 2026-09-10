"use client";

// The full verification state machine: send, cooldown countdown, verify,
// success, and every error state in plain language. On success it force-
// refreshes the ID token and re-issues the session cookie, so the cookie
// starts carrying the verified flag before entering the dashboard.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import CodeInput from "@/components/ui/code-input";

type Phase = "idle" | "sending" | "sent" | "verifying" | "success";

export default function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // One tick per second while a countdown is active.
  useEffect(() => {
    if (cooldown === 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    setPhase("sending");
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/verify/send", { method: "POST" });
    const data = await res.json();
    if (data.alreadyVerified) {
      setPhase("success");
      router.push("/dashboard");
      router.refresh();
      return;
    }
    if (!data.ok) {
      setPhase("idle");
      if (data.error === "RATE_LIMITED" || data.error === "LOCKED") {
        setCooldown(data.retryAfterSeconds ?? 60);
        setError(
          data.error === "LOCKED"
            ? "Too many attempts. Wait for the countdown, then request a new code."
            : `Please wait ${data.retryAfterSeconds}s before requesting another code.`
        );
      } else if (data.error === "DAILY_LIMIT") {
        setError("Daily email limit reached. Please try again tomorrow.");
      } else if (data.error === "NOT_SIGNED_IN") {
        router.push("/login");
      } else {
        setError("Could not send the email. Please try again.");
      }
      return;
    }
    setPhase("sent");
    setCooldown(data.cooldownSeconds ?? 60);
    if (data.delivered) {
      setInfo(`We sent a 6-digit code to ${email}. It expires in ${data.expiresInMinutes} minutes.`);
    } else if (process.env.NODE_ENV !== "production") {
      setInfo(
        "Delivery is not available for this address in test mode. The current code is printed in the VS Code terminal."
      );
    } else {
      setInfo(
        "This address cannot receive verification emails yet. Full email delivery is coming soon. You can continue with Google sign-in in the meantime."
      );
    }
  }

  async function confirm(digits: string) {
    if (phase === "verifying" || phase === "success") return;
    setPhase("verifying");
    setError(null);
    const res = await fetch("/api/auth/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: digits }),
    });
    const data = await res.json();
    if (data.ok || data.alreadyVerified) {
      // Re-issue the session cookie so it carries the verified flag.
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (idToken) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        }
      } catch {
        // Even if the refresh fails, verification succeeded server-side.
        // The user can sign in again to get a fresh cookie.
      }
      setPhase("success");
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setPhase("sent");
    setCode("");
    switch (data.error) {
      case "CODE_INCORRECT":
        setError(`Incorrect code. ${data.remainingAttempts} attempts remaining.`);
        break;
      case "CODE_INVALIDATED":
        setError("Too many wrong attempts. This code is now invalid. Request a new one.");
        break;
      case "CODE_EXPIRED":
        setError("That code has expired. Request a new one.");
        break;
      case "LOCKED":
        setCooldown(data.retryAfterSeconds ?? 900);
        setError("Too many attempts. Try again when the countdown ends.");
        break;
      case "NOT_SIGNED_IN":
        router.push("/login");
        break;
      default:
        setError("Something went wrong. Please try again.");
    }
  }

  const busy = phase === "sending" || phase === "verifying" || phase === "success";

  return (
    <div className="space-y-4">
      {phase === "idle" || phase === "sending" ? (
        <button
          onClick={send}
          disabled={busy}
          className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {phase === "sending" ? "Sending..." : "Send verification code"}
        </button>
      ) : (
        <>
          <CodeInput value={code} onChange={setCode} onComplete={confirm} disabled={busy} />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
              {info}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => confirm(code)}
              disabled={busy || code.length !== 6}
              className="flex-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
            >
              {phase === "verifying" ? "Checking..." : "Verify"}
            </button>
            <button
              onClick={send}
              disabled={busy || cooldown > 0}
              className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </>
      )}

      {phase === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
          Email verified. Taking you in...
        </p>
      )}
    </div>
  );
}