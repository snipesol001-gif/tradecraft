// Creates and executes a Scout run. Server-authoritative end to end:
// provider availability, count limits, usable credits, and the charge.
// Charging follows the provider's declared pricing:
//   free: never charges. The run is recorded with creditsSpent: 0.
//   per_discovery: found x config.scoutDiscoveryCost, charged in ONE
//     transaction with the run record, re-validating the balance.
// Zero discovered: zero charged, either pricing.
// Manual runs do not create notifications: the user is watching results.
// The Premium background runner will notify, sharing this contract.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import {
  getCreditsConfig,
  computeBuckets,
  writeBuckets,
  writeLedgerEntry,
  InsufficientCreditsError,
} from "@/lib/credits";
import { getScoutProvider } from "@/lib/scout-providers";

export const maxDuration = 60;

const MAX_COUNT = 50;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_INCOMPLETE" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const providerId = typeof body?.providerId === "string" ? body.providerId : "";
  const count = typeof body?.count === "number" ? body.count : NaN;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return NextResponse.json(
      { ok: false, error: "INVALID_COUNT", max: MAX_COUNT },
      { status: 400 }
    );
  }

  const provider = getScoutProvider(providerId);
  if (!provider) {
    return NextResponse.json({ ok: false, error: "UNKNOWN_PROVIDER" }, { status: 404 });
  }
  if (provider.status !== "active") {
    return NextResponse.json(
      {
        ok: false,
        error: "PROVIDER_UNAVAILABLE",
        status: provider.status,
        statusNote: provider.statusNote,
      },
      { status: 409 }
    );
  }

  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const uid = sessionUser.uid;
  const userRef = db.collection("users").doc(uid);

  // The user's profile services are the run's matching context.
  const userSnap = await userRef.get();
  const services = Array.isArray(userSnap.data()?.services)
    ? (userSnap.data()!.services as string[])
    : [];

  const preState = computeBuckets(userSnap.data(), config, Date.now());
  const usable = preState.earned + preState.daily;
  const charges = provider.pricing === "per_discovery";

  // Count capping applies only to paid providers: a free provider has no
  // credit reason to shrink the request.
  const allowedCount = charges
    ? Math.min(count, Math.floor(usable / config.scoutDiscoveryCost))
    : count;
  if (charges && allowedCount === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "INSUFFICIENT_CREDITS",
        total: usable,
        cost: config.scoutDiscoveryCost,
      },
      { status: 402 }
    );
  }

  // Discovery. Freshness hooks run first for providers that declare them.
  let discovered;
  try {
    if (provider.beforeRun) {
      await provider.beforeRun();
    }
    const result = await provider.run({ uid, count: allowedCount, serviceIds: services });
    discovered = result.discoveries;
  } catch (err) {
    console.error("[scout] provider run failed:", err);
    return NextResponse.json({ ok: false, error: "SCOUT_RUN_FAILED" }, { status: 500 });
  }

  const found = discovered.length;

  if (!charges || found === 0) {
    // Free provider, or nothing discovered: record honestly, charge zero.
    const runRef = db.collection("scoutRuns").doc();
    await runRef.set({
      uid,
      providerId,
      status: "completed",
      requestedCount: count,
      foundCount: found,
      creditsSpent: 0,
      discoveryIds: discovered.map((d) => d.opportunityId),
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({
      ok: true,
      runId: runRef.id,
      provider: provider.id,
      discovered,
      creditsSpent: 0,
      balanceAfter: usable,
    });
  }

  // Paid discovery: charge and record in ONE transaction, re-validating
  // the balance. If funds moved mid-run, the run fails with nothing
  // charged.
  const charge = found * config.scoutDiscoveryCost;
  try {
    const { runId, balanceAfter } = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(userRef);
      const now = Date.now();
      const state = computeBuckets(fresh.data(), config, now);
      const total = state.earned + state.daily;
      if (total < charge) {
        throw new InsufficientCreditsError(total);
      }
      const fromDaily = Math.min(state.daily, charge);
      const fromEarned = charge - fromDaily;
      const balanceAfter = state.earned - fromEarned + (state.daily - fromDaily);
      writeBuckets(
        tx,
        userRef,
        uid,
        {
          earned: state.earned - fromEarned,
          daily: state.daily - fromDaily,
          nextResetAt: state.nextResetAt,
          resetDue: false,
        }
      );
      writeLedgerEntry(tx, uid, -charge, "spend_scout", balanceAfter, providerId);
      const runRef = db.collection("scoutRuns").doc();
      tx.create(runRef, {
        uid,
        providerId,
        status: "completed",
        requestedCount: count,
        foundCount: found,
        creditsSpent: charge,
        discoveryIds: discovered.map((d) => d.opportunityId),
        createdAt: FieldValue.serverTimestamp(),
      });
      return { runId: runRef.id, balanceAfter };
    });

    return NextResponse.json({
      ok: true,
      runId,
      provider: provider.id,
      discovered,
      creditsSpent: charge,
      balanceAfter,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { ok: false, error: "INSUFFICIENT_CREDITS", total: err.total },
        { status: 402 }
      );
    }
    console.error("[scout] charge failed:", err);
    return NextResponse.json({ ok: false, error: "SCOUT_RUN_FAILED" }, { status: 500 });
  }
}