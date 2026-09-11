"use client";

// The verification state machine: send, cooldown countdown, verify,
// success, and every error state in plain language. On success it
// force-refreshes the ID token and re-issues the session cookie, so the
// cookie starts carrying the verified flag before entering the app.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import CodeInput from "@/components/ui/code-input";

type Phase = "idle" | "sending" | "sent" | "verifying" | "success";

export default function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

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
      setInfo(
        `We sent a 6-digit code to ${email}. It expires in ${data.expiresInMinutes} minutes.`
      );
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
        // Verification succeeded server-side regardless.
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
    <div className="space-y-5">
      {phase === "idle" || phase === "sending" ? (
        <Button size="lg" className="w-full" onClick={send} loading={phase === "sending"}>
          Send verification code
        </Button>
      ) : (
        <>
          <CodeInput value={code} onChange={setCode} onComplete={confirm} disabled={busy} />

          {error && (
            <p className="text-sm text-danger text-center" role="alert">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="text-center text-sm text-text-muted">{info}</p>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => confirm(code)}
              disabled={busy || code.length !== 6}
              loading={phase === "verifying"}
            >
              Verify
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={send}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
          </div>
        </>
      )}

      {phase === "success" && (
        <p className="text-center text-sm font-medium text-success">
          Email verified. Taking you in...
        </p>
      )}
    </div>
  );
}