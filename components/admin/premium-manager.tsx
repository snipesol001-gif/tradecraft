"use client";

// Premium grant/revoke form. Talks to the existing owner-guarded API.
// Duration applies to grants only; revokes are immediate. The result
// panel shows the honest outcome of every action.

import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Action = "grant" | "revoke";

type ResultState = {
  ok: boolean;
  text: string;
};

export default function PremiumManager() {
  const [email, setEmail] = useState("");
  const [action, setAction] = useState<Action>("grant");
  const [duration, setDuration] = useState<number | null>(30);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/grant-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          action,
          durationDays: action === "grant" ? duration : undefined,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResult({
          ok: true,
          text:
            action === "grant"
              ? `Premium granted to ${email.trim()}${duration ? ` for ${duration} days` : " with no expiry"}.`
              : `Premium revoked from ${email.trim()}.`,
        });
        setReason("");
      } else if (data?.error === "USER_NOT_FOUND") {
        setResult({ ok: false, text: "No TradeCraft account exists for that email." });
      } else if (data?.error === "NOT_OWNER") {
        setResult({ ok: false, text: "Your session is not the owner account. Sign in as the owner and retry." });
      } else {
        setResult({ ok: false, text: data?.note ?? data?.error ?? "The action failed. Please try again." });
      }
    } catch {
      setResult({ ok: false, text: "The action failed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email.trim().length > 3 && reason.trim().length > 0;

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            Account email
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            autoComplete="off"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Action</p>
          <div className="grid grid-cols-2 gap-2">
            {(["grant", "revoke"] as Action[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  action === a
                    ? "border-text-primary bg-text-primary text-background"
                    : "border-border bg-surface text-text-muted hover:border-border-strong"
                )}
              >
                {a === "grant" && <Crown size={15} />}
                {a === "grant" ? "Grant Premium" : "Revoke Premium"}
              </button>
            ))}
          </div>
        </div>

        {action === "grant" && (
          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Duration</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "7 days", value: 7 },
                { label: "30 days", value: 30 },
                { label: "No expiry", value: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    duration === opt.value
                      ? "border-text-primary bg-text-primary text-background"
                      : "border-border bg-surface text-text-muted hover:border-border-strong"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-text-primary">
            Reason <span className="font-normal text-text-faint">(required, written to the audit log)</span>
          </label>
          <Input
            id="reason"
            type="text"
            required
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Early access partner"
          />
        </div>

        {result && (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              result.ok
                ? "border-success-border bg-success-soft text-success"
                : "border-danger-border bg-danger-soft text-danger"
            )}
          >
            {result.text}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit} loading={busy}>
          {busy ? "Working..." : action === "grant" ? "Grant Premium" : "Revoke Premium"}
        </Button>
      </form>
    </Card>
  );
}