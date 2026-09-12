"use client";

// Client hook for the signed-in user's credit state (two buckets: earned
// credits that never reset, plus the daily allowance). Fetches once, ticks
// locally every second with server-time drift correction. refresh() lets
// features update the display after spending or earning credits.

import { useCallback, useEffect, useRef, useState } from "react";

export type CreditsView = {
  total: number;
  earned: number;
  daily: number;
  nextResetAt: number;
  dailyAllowance: number;
};

export function useCredits() {
  const [credits, setCredits] = useState<CreditsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const driftRef = useRef(0);
  const resetInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/state");
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || typeof data.total !== "number") {
        setError("Could not load credits.");
        return;
      }
      driftRef.current = data.serverTime - Date.now();
      setCredits({
        total: data.total,
        earned: data.earned,
        daily: data.daily,
        nextResetAt: data.nextResetAt,
        dailyAllowance: data.dailyAllowance,
      });
      setError(null);
    } catch {
      setError("Could not load credits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const serverNow = nowMs + driftRef.current;
  const msRemaining = credits ? Math.max(0, credits.nextResetAt - serverNow) : 0;

  useEffect(() => {
    if (credits && msRemaining <= 0 && !resetInFlightRef.current) {
      resetInFlightRef.current = true;
      refresh().finally(() => {
        resetInFlightRef.current = false;
      });
    }
  }, [credits, msRemaining, refresh]);

  return { credits, balance: credits?.total ?? null, msRemaining, loading, error, refresh };
}