// The Paystack adapter. Server-side only: the secret key must never
// reach a browser.
//
// Flow:
//  - initializeTransaction: creates a hosted checkout and returns the
//    authorization URL. Amounts are set here from config, in kobo.
//  - verifyTransaction: server-to-server confirmation. Used on user
//    return and as the trust anchor for activations.
//  - verifyWebhookSignature: HMAC-SHA512 of the RAW body with the secret
//    key, compared in constant time. Paystack signs every webhook.

import { createHmac, timingSafeEqual } from "crypto";
import type { InitializedPayment, PremiumPlan, VerifiedPayment } from "./types";

const API_ROOT = "https://api.paystack.co";
const TIMEOUT_MS = 20_000;

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function makeReference(plan: PremiumPlan, uid: string): string {
  // Unique, traceable, under Paystack's 100 char limit.
  const stamp = Date.now().toString(36).toUpperCase();
  return `TC-${plan.toUpperCase()}-${uid.slice(0, 8)}-${stamp}`;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  plan: PremiumPlan;
  uid: string;
}): Promise<{ ok: true; authorizationUrl: string; reference: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ROOT}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        currency: "NGN",
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: { uid: params.uid, plan: params.plan },
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.status || !body?.data?.authorization_url) {
      const message = body?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: message };
    }
    return {
      ok: true,
      authorizationUrl: body.data.authorization_url,
      reference: body.data.reference,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Payment initialization failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyTransaction(
  reference: string
): Promise<{ ok: true; payment: VerifiedPayment } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${API_ROOT}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey()}` },
        signal: controller.signal,
      }
    );
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.status || !body?.data) {
      const message = body?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: message };
    }
    const d = body.data;
    const metadata = (d.metadata ?? {}) as { uid?: string; plan?: string };
    const plan = metadata.plan === "monthly" || metadata.plan === "weekly" ? metadata.plan : null;
    if (!plan || typeof metadata.uid !== "string") {
      return { ok: false, error: "Payment metadata is incomplete." };
    }
    const paidAtMs = typeof d.paid_at === "string" ? new Date(d.paid_at).getTime() : null;
    return {
      ok: true,
      payment: {
        status: d.status,
        amountKobo: typeof d.amount === "number" ? d.amount : 0,
        plan,
        uid: metadata.uid,
        paidAtMs: paidAtMs && !Number.isNaN(paidAtMs) ? paidAtMs : null,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Verification failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}