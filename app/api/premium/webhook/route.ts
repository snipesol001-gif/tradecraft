// The Paystack webhook. Production path for async confirmations (bank
// transfers, DVA). Signature-verified with HMAC-SHA512 over the RAW body
// against PAYSTACK_SECRET_KEY. Idempotent via the same paymentEvents
// gate as the verify route. Manual runs never touch this; only Paystack
// POSTs here.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { verifyWebhookSignature } from "@/lib/payments/paystack";
import { getPremiumPlansConfig, planDays, planPriceNaira } from "@/lib/premium-config";
import { activatePremiumForPayment } from "@/lib/premium";

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
    // Acknowledge other event types honestly: Paystack stops retrying.
    return NextResponse.json({ ok: true, ignored: event?.event ?? "unknown" });
  }

  const reference = event.data.reference ?? "";
  const uid = event.data.metadata?.uid ?? "";
  const plan = event.data.metadata?.plan === "monthly" ? "monthly" : event.data.metadata?.plan === "weekly" ? "weekly" : null;
  const status = event.data.status;

  if (!reference || !uid || !plan || status !== "success") {
    return NextResponse.json({ ok: true, ignored: "incomplete_or_unsuccessful" });
  }

  const config = await getPremiumPlansConfig();
  const expectedKobo = planPriceNaira(plan, config) * 100;
  const amountKobo = typeof event.data.amount === "number" ? event.data.amount : 0;
  if (amountKobo < expectedKobo) {
    console.error(`[webhook] amount mismatch on ${reference}: ${amountKobo} < ${expectedKobo}`);
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
      const days = planDays(plan, config);
      const amountNaira = planPriceNaira(plan, config);
      await activatePremiumForPayment({ uid, durationDays: days, reference, amountNaira });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] processing failed:", err);
    // Non-200 makes Paystack retry; the paymentEvents gate keeps retries
    // idempotent.
    return NextResponse.json({ ok: false, error: "Processing failed." }, { status: 500 });
  }
}