// Starts a Premium checkout. Server-defined prices and reference; the
// client never supplies an amount. Returns Paystack's hosted checkout
// URL. Activation happens via webhook or on-return verify, never here.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import {
  getPremiumPlansConfig,
  planDays,
  planPriceNaira,
} from "@/lib/premium-config";
import {
  isPaystackConfigured,
  initializeTransaction,
  makeReference,
  nairaToKobo,
} from "@/lib/payments/paystack";
import { getPremiumStatus } from "@/lib/premium";
import type { PremiumPlan } from "@/lib/payments/types";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json(
      { ok: false, error: "ONBOARDING_INCOMPLETE" },
      { status: 403 }
    );
  }
  if (!isPaystackConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawPlan = body?.plan;
  if (rawPlan !== "weekly" && rawPlan !== "monthly") {
    return NextResponse.json({ ok: false, error: "Choose a plan." }, { status: 400 });
  }
  const plan: PremiumPlan = rawPlan;

  const config = await getPremiumPlansConfig();
  if (!config.paymentsEnabled) {
    return NextResponse.json(
      { ok: false, error: "Payments are temporarily unavailable." },
      { status: 503 }
    );
  }

  const premium = await getPremiumStatus(sessionUser.uid);
  if (premium.active) {
    return NextResponse.json({ ok: false, error: "ALREADY_PREMIUM" }, { status: 409 });
  }

  const priceNaira = planPriceNaira(plan, config);
  const reference = makeReference(plan, sessionUser.uid);

  const authUser = await getAuth(getAdminApp()).getUser(sessionUser.uid);
  const email = authUser.email ?? "";
  if (!email) {
    return NextResponse.json({ ok: false, error: "Account email missing." }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/premium?ref=${encodeURIComponent(reference)}`;

  const init = await initializeTransaction({
    email,
    amountKobo: nairaToKobo(priceNaira),
    reference,
    callbackUrl,
    plan,
    uid: sessionUser.uid,
  });

  if (!init.ok) {
    console.error("[premium] checkout init failed:", init.error);
    return NextResponse.json(
      { ok: false, error: "Could not start the payment. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    authorizationUrl: init.authorizationUrl,
    reference: init.reference,
    plan,
    amountNaira: priceNaira,
    days: planDays(plan, config),
  });
}