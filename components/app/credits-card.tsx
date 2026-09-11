"use client";

// Dashboard credits card. Balance plus a live countdown to the next daily
// reset, computed from server timestamps. At zero balance the card becomes
// a warning surface: the honest refill state, no fake purchase.

import { useState } from "react";
import { useCredits } from "@/hooks/use-credits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

export default function CreditsCard() {
  const { balance, dailyAllowance, msRemaining, loading, error } = useCredits();
  const [noteOpen, setNoteOpen] = useState(false);

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-text-faint">Loading credits...</p>
      </Card>
    );
  }

  if (error || balance === null) {
    return (
      <Card className="p-5">
        <p className="text-sm text-danger">{error ?? "Credits unavailable."}</p>
      </Card>
    );
  }

  if (balance === 0) {
    return (
      <Card variant="warning" className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Credits</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">0</p>
            <p className="mt-1 text-sm text-warning">
              You have used all {dailyAllowance} daily credits.
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
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 w-full"
          onClick={() => setNoteOpen((v) => !v)}
        >
          Refill credits
        </Button>
        {noteOpen && (
          <p className="mt-3 text-xs leading-relaxed text-warning">
            Credits refill automatically at your next daily reset, shown in the
            countdown above. Nothing to buy and nothing lost: unused credits do
            not roll over, and every account gets a fresh {dailyAllowance} each
            day. Larger daily allowances arrive with Premium, coming soon.
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
          <p className="mt-1 text-xs text-text-faint">{dailyAllowance} refill daily</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">Next reset in</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatCountdown(msRemaining)}
          </p>
          <p className="mt-1 text-xs text-text-faint">UTC, every day</p>
        </div>
      </div>
    </Card>
  );
}