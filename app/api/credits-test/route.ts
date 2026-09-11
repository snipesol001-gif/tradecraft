// TEMPORARY diagnostic route for the credit engine. Runs a fixed sequence
// against the signed-in user's own balance and reports each step honestly.
// Deleted after verification, never presented as a feature.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getCreditState,
  grantCredits,
  spendCredits,
  InsufficientCreditsError,
} from "@/lib/credits";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const uid = sessionUser.uid;
  const steps: Record<string, unknown> = {};

  try {
    steps.before = await getCreditState(uid);

    steps.spend1 = await spendCredits({ uid, amount: 1, reason: "spend_scout", refId: "engine-test" });

    try {
      await spendCredits({ uid, amount: 1_000_000, reason: "spend_scout" });
      steps.impossibleSpend = "UNEXPECTEDLY SUCCEEDED (this would be a bug)";
    } catch (error) {
      steps.impossibleSpend =
        error instanceof InsufficientCreditsError
          ? "correctly rejected (INSUFFICIENT_CREDITS)"
          : `unexpected error: ${error instanceof Error ? error.message : String(error)}`;
    }

    steps.grant3 = await grantCredits({
      uid,
      amount: 3,
      reason: "admin_grant",
      refId: "engine-test",
      actorUid: uid,
    });

    steps.after = await getCreditState(uid);

    return NextResponse.json({ ok: true, steps });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      steps,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}