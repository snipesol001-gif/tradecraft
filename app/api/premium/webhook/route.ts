// The Paystack webhook. Signature-verified with HMAC-SHA512 over the RAW
// body. Per-plan price and duration resolution (Premium, legacy monthly,
// Premium+), idempotent via the paymentEvents gate.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { getPremiumPlansConfig } from "@/lib/premium-config";
import { activatePremiumForPayment } from "@/lib/premium";
import type { PremiumPlan } from "@/lib/payments/types";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      status?: string;
      amount?: number;
      metadata?: { uid?: string; plan?: string };
    };
  } | null = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Bad payload." }, { status: 400 });
  }

  if (event?.event !== "charge.success" || !event.data) {
    return NextResponse.json({ ok: true, ignored: event?.event ?? "unknown" });
  }

  const reference = event.data.reference ?? "";
  const uid = event.data.metadata?.uid ?? "";
  const rawPlan = event.data.metadata?.plan;
  // The full three-tier union, explicitly typed, so later comparisons
  // against "premium_plus" are valid to the compiler.
  const plan: PremiumPlan | null =
    rawPlan === "weekly" || rawPlan === "monthly" || rawPlan === "premium_plus"
      ? rawPlan
      : null;
  const status = event.data.status;

  if (!reference || !uid || !plan || status !== "success") {
    return NextResponse.json({ ok: true, ignored: "incomplete_or_unsuccessful" });
  }

  const config = await getPremiumPlansConfig();

  // Per-plan price and duration, server-resolved.
  let expectedKobo: number;
  let days: number;
  let amountNaira: number;
  if (plan === "premium_plus") {
    expectedKobo = config.premiumPlusMonthlyNaira * 100;
    days = config.premiumPlusDays;
    amountNaira = config.premiumPlusMonthlyNaira;
  } else if (plan === "monthly") {
    expectedKobo = config.monthlyPriceNaira * 100;
    days = config.monthlyDays;
    amountNaira = config.monthlyPriceNaira;
  } else {
    expectedKobo = config.weeklyPriceNaira * 100;
    days = config.weeklyDays;
    amountNaira = config.weeklyPriceNaira;
  }

  const amountKobo = typeof event.data.amount === "number" ? event.data.amount : 0;
  if (amountKobo < expectedKobo) {
    console.error(
      `[webhook] amount mismatch on ${reference}: ${amountKobo} < ${expectedKobo}`
    );
    return NextResponse.json({ ok: true, ignored: "amount_mismatch" });
  }

  const db = getFirestore(getAdminApp());
  const gateRef = db.collection("paymentEvents").doc(reference);

  try {
    let shouldActivate = false;
    await db.runTransaction(async (tx) => {
      const gateSnap = await tx.get(gateRef);
      if (gateSnap.exists) return;
      tx.create(gateRef, {
        reference,
        uid,
        plan,
        amountKobo,
        source: "webhook",
        processedAt: FieldValue.serverTimestamp(),
      });
      shouldActivate = true;
    });

    if (shouldActivate) {
      await activatePremiumForPayment({
        uid,
        durationDays: days,
        reference,
        amountNaira,
        plan,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] processing failed:", err);
    return NextResponse.json({ ok: false, error: "Processing failed." }, { status: 500 });
  }
}