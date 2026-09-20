// The Premium entitlement system. Server-side only.
//
// Sources of truth: users/{uid}.premium.active plus premium.expiresAt.
// The custom claim premium:true mirrors the document for fast gating,
// but durable checks re-read the document (blueprint section 73).
// Expiry is lazy (the proven credits-reset pattern). Grants, revokes,
// and paid activations are audited.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin";

export type PremiumStatus = {
  active: boolean;
  expiresAtMs: number | null;
  source: "admin" | "subscription" | null;
};

function readPremium(
  data: Record<string, unknown> | undefined,
  nowMs: number
): PremiumStatus {
  const p = (data?.premium ?? {}) as {
    active?: boolean;
    expiresAtMs?: number | null;
    source?: string;
  };
  const expiresAtMs = typeof p.expiresAtMs === "number" ? p.expiresAtMs : null;
  const expired = expiresAtMs !== null && expiresAtMs <= nowMs;
  const active = p.active === true && !expired;
  return {
    active,
    expiresAtMs,
    source: active ? ((p.source as PremiumStatus["source"]) ?? "admin") : null,
  };
}

export async function getPremiumStatus(uid: string): Promise<PremiumStatus> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const now = Date.now();
  const status = readPremium(snap.data(), now);

  if (snap.data()?.premium?.active === true && status.active === false) {
    await ref.set(
      { premium: { active: false, expiredAt: FieldValue.serverTimestamp() } },
      { merge: true }
    );
    const authUser = await getAuth(getAdminApp()).getUser(uid);
    await getAuth(getAdminApp()).setCustomUserClaims(uid, {
      ...authUser.customClaims,
      premium: false,
    });
  }

  return status;
}

export function evaluatePremium(
  data: Record<string, unknown> | undefined,
  nowMs: number
): boolean {
  return readPremium(data, nowMs).active;
}

async function syncPremiumClaim(uid: string, active: boolean): Promise<void> {
  const authUser = await getAuth(getAdminApp()).getUser(uid);
  await getAuth(getAdminApp()).setCustomUserClaims(uid, {
    ...authUser.customClaims,
    premium: active,
  });
}

export async function grantPremium(params: {
  uid: string;
  actorUid: string;
  durationDays: number | null;
  reason: string;
}): Promise<void> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(params.uid);
  const expiresAtMs =
    params.durationDays === null
      ? null
      : Date.now() + params.durationDays * 24 * 60 * 60 * 1000;

  await ref.set(
    {
      premium: { active: true, expiresAtMs, source: "admin" },
      premiumGrantedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncPremiumClaim(params.uid, true);

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_grant",
    targetUid: params.uid,
    durationDays: params.durationDays,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("notifications").add({
    uid: params.uid,
    type: "premium_activated",
    title: "Premium activated",
    body:
      params.durationDays === null
        ? "Premium is now active on your account."
        : `Premium is active for ${params.durationDays} days. Explore Premium features from your dashboard.`,
    link: "/profile",
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function revokePremium(params: {
  uid: string;
  actorUid: string;
  reason: string;
}): Promise<void> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(params.uid);

  await ref.set(
    {
      premium: { active: false },
      premiumRevokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncPremiumClaim(params.uid, false);

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_revoke",
    targetUid: params.uid,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Paid activation. Extends from the current expiry when the user is
// already premium, so renewals never lose days. Source: subscription.
export async function activatePremiumForPayment(params: {
  uid: string;
  durationDays: number;
  reference: string;
  amountNaira: number;
}): Promise<{ expiresAtMs: number }> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(params.uid);
  const snap = await ref.get();
  const now = Date.now();
  const current = readPremium(snap.data(), now);
  const baseMs =
    current.active && current.expiresAtMs !== null && current.expiresAtMs > now
      ? current.expiresAtMs
      : now;
  const expiresAtMs = baseMs + params.durationDays * 24 * 60 * 60 * 1000;

  await ref.set(
    {
      premium: { active: true, expiresAtMs, source: "subscription" },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncPremiumClaim(params.uid, true);

  await db.collection("auditLogs").add({
    actorUid: params.uid,
    action: "premium_purchase",
    targetUid: params.uid,
    reference: params.reference,
    amountNaira: params.amountNaira,
    durationDays: params.durationDays,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("notifications").add({
    uid: params.uid,
    type: "premium_activated",
    title: "Premium activated",
    body: `Payment received. Premium is active until ${new Date(expiresAtMs).toLocaleDateString()}.`,
    link: "/profile",
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { expiresAtMs };
}