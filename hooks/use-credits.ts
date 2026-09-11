"use client";

// Client hook for the signed-in user's credit state. Fetches once, then
// ticks locally every second using server-provided timestamps corrected
// for device clock drift. Exposes refresh() so future features (spending
// credits on scouting, referral rewards) can update the display after an
// action without a page reload.

import { useCallback, useEffect, useRef, useState } from "react";

export type CreditsView = {
  balance: number;
  nextResetAt: number;
  dailyAllowance: number;
};

export function useCredits() {
  const [credits, setCredits] = useState<CreditsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // offset = serverTime - clientTime measured at fetch moment. Adding it
  // to local time approximates the server clock.
  const driftRef = useRef(0);
  const resetInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/state");
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError("Could not load credits.");
        return;
      }
      driftRef.current = data.serverTime - Date.now();
      setCredits({
        balance: data.balance,
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

  // Local tick, once per second. Pure display work, zero server traffic.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const serverNow = nowMs + driftRef.current;
  const msRemaining = credits ? Math.max(0, credits.nextResetAt - serverNow) : 0;

  // Zero crossing: refetch exactly once. That fetch performs the lazy
  // server-side reset, which returns a fresh nextResetAt. The ref guards
  // against repeat calls while the fetch is in flight. Multiple tabs are
  // safe: the reset transaction is a no-op for whoever is second.
  useEffect(() => {
    if (credits && msRemaining <= 0 && !resetInFlightRef.current) {
      resetInFlightRef.current = true;
      refresh().finally(() => {
        resetInFlightRef.current = false;
      });
    }
  }, [credits, msRemaining, refresh]);

  return { credits, balance: credits?.balance ?? null, dailyAllowance: credits?.dailyAllowance ?? null, msRemaining, loading, error, refresh };
}