"use client";

// Dashboard credits card, two buckets: the big number is the total
// spendable balance, with the split shown underneath. At zero total, the
// card becomes the honest refill state.

import { useState } from "react";
import { useCredits } from "@/hooks/use-credits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatCountdown(ms: number): string {
  const t = Math.ceil(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(t / 3600))}h ${pad(Math.floor((t % 3600) / 60))}m ${pad(t % 60)}s`;
}

export default function CreditsCard() {
  const { credits, balance, msRemaining, loading, error } = useCredits();
  const [noteOpen, setNoteOpen] = useState(false);

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-text-faint">Loading credits...</p>
      </Card>
    );
  }

  if (error || balance === null || !credits) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">{error ?? "Credits unavailable."}</p>
      </Card>
    );
  }

  const split =
    credits.earned > 0
      ? `${credits.daily} daily + ${credits.earned} earned`
      : `${credits.dailyAllowance} refill daily`;

  if (balance === 0) {
    return (
      <Card variant="warning" className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Credits</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">0</p>
            <p className="mt-1 text-sm text-warning">
              You have used all your credits for today.
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Refill in</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatCountdown(msRemaining)}
            </p>
            <p className="mt-1 text-xs text-text-faint">automatic</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setNoteOpen((v) => !v)}>
          Refill credits
        </Button>
        {noteOpen && (
          <p className="mt-3 text-xs leading-relaxed text-warning">
            Your {credits.dailyAllowance} daily credits refill automatically at
            the next reset, shown in the countdown above. Earned credits (from
            referrals) never reset, they only run out when spent. Larger daily
            allowances arrive with Premium, coming soon.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Credits</p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{balance}</p>
          <p className="mt-1 text-xs text-text-faint">{split}</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">Next reset in</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatCountdown(msRemaining)}
          </p>
          <p className="mt-1 text-xs text-text-faint">daily credits only</p>
        </div>
      </div>
    </Card>
  );
}