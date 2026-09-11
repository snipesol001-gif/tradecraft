"use client";

// Dashboard credits card. Balance plus a live countdown to the next daily
// reset, computed from server timestamps (immune to device clock drift).
// When the balance reaches 0, the card switches to an out-of-credits
// state: no scouting is possible until the refill, and the "Refill
// credits" button shows the honest explanation rather than a fake purchase.

import { useState } from "react";
import { useCredits } from "@/hooks/use-credits";

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
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5">
        <p className="text-sm text-neutral-500">Loading credits...</p>
      </div>
    );
  }

  if (error || balance === null) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5">
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Credits unavailable."}</p>
      </div>
    );
  }

  if (balance === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 border dark:border-amber-900 dark:bg-amber-950 p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Credits
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">0</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              You have used all {dailyAllowance} daily credits.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Refill in
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatCountdown(msRemaining)}
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">automatic</p>
          </div>
        </div>
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className="mt-4 w-full rounded-md border border-amber-400 dark:border-amber-800 font-medium py-2.5 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/50"
        >
          Refill credits
        </button>
        {noteOpen && (
          <p className="mt-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Credits refill automatically at your next daily reset, shown in the
            countdown above. Nothing to buy and nothing lost: unused credits do
            not roll over, and every account gets a fresh {dailyAllowance} each
            day. Larger daily allowances arrive with Premium, coming soon.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">Credits</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{balance}</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            {dailyAllowance} refill daily
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Next reset in</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatCountdown(msRemaining)}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">UTC, every day</p>
        </div>
      </div>
    </div>
  );
}