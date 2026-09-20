// Verifies a payment by reference (Paystack server-to-server), then
// activates Premium exactly once. The paymentEvents document keyed by
// reference is the activation gate: webhook and on-return verify race
// here, and only one wins create().

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { verifyTransaction } from "@/lib/payments/paystack";
import { getPremiumPlansConfig, planDays, planPriceNaira } from "@/lib/premium-config";
import { activatePremiumForPayment } from "@/lib/premium";

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
    // A reference from someone else's checkout can never activate here.
    return NextResponse.json({ ok: false, error: "NOT_YOUR_PAYMENT" }, { status: 403 });
  }

  if (payment.status !== "success") {
    return NextResponse.json({ ok: false, status: payment.status }, { status: 400 });
  }

  const config = await getPremiumPlansConfig();
  const expectedKobo = planPriceNaira(payment.plan, config) * 100;
  if (payment.amountKobo < expectedKobo) {
    // Amount tampering or config changed mid-flight: record, refuse.
    console.error(
      `[premium] amount mismatch on ${reference}: got ${payment.amountKobo}, expected ${expectedKobo}`
    );
    return NextResponse.json({ ok: false, error: "AMOUNT_MISMATCH" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const gateRef = db.collection("paymentEvents").doc(reference);

  let activation: { alreadyProcessed: boolean } | null = null;
  try {
    await db.runTransaction(async (tx) => {
      const gateSnap = await tx.get(gateRef);
      if (gateSnap.exists) {
        activation = { alreadyProcessed: true };
        return;
      }
      tx.create(gateRef, {
        reference,
        uid: payment.uid,
        plan: payment.plan,
        amountKobo: payment.amountKobo,
        processedAt: FieldValue.serverTimestamp(),
      });
      activation = { alreadyProcessed: false };
    });
  } catch (err) {
    console.error("[premium] gate transaction failed:", err);
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 500 });
  }

  if (activation && activation.alreadyProcessed) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  const days = planDays(payment.plan, config);
  const amountNaira = planPriceNaira(payment.plan, config);
  const activationResult = await activatePremiumForPayment({
    uid: payment.uid,
    durationDays: days,
    reference,
    amountNaira,
  });

  return NextResponse.json({
    ok: true,
    activated: true,
    expiresAtMs: activationResult.expiresAtMs,
  });
}