// Verifies a payment by reference, then activates the entitlement the
// plan purchased: Premium (weekly/monthly) or Premium+. Exactly once,
// via the paymentEvents gate. Amount checked against the config price
// for the specific plan.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { verifyTransaction } from "@/lib/payments/paystack";
import {
  getPremiumPlansConfig,
  planDays,
  planPriceNaira,
} from "@/lib/premium-config";
import { activatePremiumForPayment } from "@/lib/premium";

function planPriceFor(plan: string, config: ReturnType<typeof getPremiumPlansConfig> extends Promise<infer C> ? C : never): number {
  // Overloaded at call sites with concrete config; kept simple.
  return 0;
}
void planPriceFor;

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("reference") ?? "";
  if (!reference || reference.length > 100) {
    return NextResponse.json({ ok: false, error: "INVALID_REFERENCE" }, { status: 400 });
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 502 });
  }

  const payment = verified.payment;
  if (payment.uid !== sessionUser.uid) {
    return NextResponse.json({ ok: false, error: "NOT_YOUR_PAYMENT" }, { status: 403 });
  }

  if (payment.status !== "success") {
    return NextResponse.json({ ok: false, status: payment.status }, { status: 400 });
  }

  const config = await getPremiumPlansConfig();

  // Resolve price and duration per plan.
  let expectedKobo: number;
  let days: number;
  let amountNaira: number;
  if (payment.plan === "premium_plus") {
    expectedKobo = config.premiumPlusMonthlyNaira * 100;
    days = config.premiumPlusDays;
    amountNaira = config.premiumPlusMonthlyNaira;
  } else if (payment.plan === "monthly") {
    expectedKobo = config.monthlyPriceNaira * 100;
    days = config.monthlyDays;
    amountNaira = config.monthlyPriceNaira;
  } else {
    expectedKobo = config.weeklyPriceNaira * 100;
    days = config.weeklyDays;
    amountNaira = config.weeklyPriceNaira;
  }

  if (payment.amountKobo < expectedKobo) {
    console.error(
      `[premium] amount mismatch on ${reference}: got ${payment.amountKobo}, expected ${expectedKobo}`
    );
    return NextResponse.json({ ok: false, error: "AMOUNT_MISMATCH" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const gateRef = db.collection("paymentEvents").doc(reference);

  let alreadyProcessed = false;
  try {
    await db.runTransaction(async (tx) => {
      const gateSnap = await tx.get(gateRef);
      if (gateSnap.exists) {
        alreadyProcessed = true;
        return;
      }
      tx.create(gateRef, {
        reference,
        uid: payment.uid,
        plan: payment.plan,
        amountKobo: payment.amountKobo,
        processedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("[premium] gate transaction failed:", err);
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 500 });
  }

  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  const activation = await activatePremiumForPayment({
    uid: payment.uid,
    durationDays: days,
    reference,
    amountNaira,
    plan: payment.plan,
  });

  return NextResponse.json({
    ok: true,
    activated: true,
    plan: payment.plan,
    expiresAtMs: activation.expiresAtMs,
  });
}