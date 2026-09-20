// The Premium entitlement system. Server-side only.
//
// Two tiers:
//   premium      - the weekly tier (or admin grants)
//   premiumPlus  - the monthly tier: everything in Premium, plus
//                  unlimited credits, background discovery, full theme
//                  library (the credit engine consults premiumPlus)
//
// Source of truth: users/{uid}.premium and users/{uid}.premiumPlus.
// Custom claims mirror both for fast gating, but durable checks re-read
// the document (blueprint section 73). Expiry is lazy: any check that
// finds an expired grant flips it off in the same operation.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin";

export type PremiumStatus = {
  active: boolean;
  expiresAtMs: number | null;
  source: "admin" | "subscription" | null;
};

export type PremiumPlusStatus = {
  active: boolean;
  expiresAtMs: number | null;
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

function readPremiumPlus(
  data: Record<string, unknown> | undefined,
  nowMs: number
): PremiumPlusStatus {
  const p = (data?.premiumPlus ?? {}) as {
    active?: boolean;
    expiresAtMs?: number | null;
  };
  const expiresAtMs = typeof p.expiresAtMs === "number" ? p.expiresAtMs : null;
  const expired = expiresAtMs !== null && expiresAtMs <= nowMs;
  return { active: p.active === true && !expired, expiresAtMs };
}

async function syncClaims(
  uid: string,
  updates: Record<string, unknown>
): Promise<void> {
  const authUser = await getAuth(getAdminApp()).getUser(uid);
  await getAuth(getAdminApp()).setCustomUserClaims(uid, {
    ...authUser.customClaims,
    ...updates,
  });
}

// The durable Premium check. Reads the document, lazily expires stale
// grants, syncs the claim when the state changes.
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
    await syncClaims(uid, { premium: false });
  }

  return status;
}

// The durable Premium+ check. Same lazy-expiry pattern.
export async function getPremiumPlusStatus(
  uid: string
): Promise<PremiumPlusStatus> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const now = Date.now();
  const status = readPremiumPlus(snap.data(), now);

  if (snap.data()?.premiumPlus?.active === true && status.active === false) {
    await ref.set(
      { premiumPlus: { active: false, expiredAt: FieldValue.serverTimestamp() } },
      { merge: true }
    );
    await syncClaims(uid, { premiumPlus: false });
  }

  return status;
}

// For use inside an existing transaction: read-only evaluation, no
// writes. Callers handle their own claim syncing.
export function evaluatePremium(
  data: Record<string, unknown> | undefined,
  nowMs: number
): boolean {
  return readPremium(data, nowMs).active;
}

// Admin grant of Premium. durationDays: null means no expiry.
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

  await syncClaims(params.uid, { premium: true });

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

// Admin revoke of Premium.
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

  await syncClaims(params.uid, { premium: false });

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_revoke",
    targetUid: params.uid,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Admin grant of Premium+.
export async function grantPremiumPlus(params: {
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
      premiumPlus: { active: true, expiresAtMs },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncClaims(params.uid, { premiumPlus: true });

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_plus_grant",
    targetUid: params.uid,
    durationDays: params.durationDays,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Admin revoke of Premium+.
export async function revokePremiumPlus(params: {
  uid: string;
  actorUid: string;
  reason: string;
}): Promise<void> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(params.uid);

  await ref.set({ premiumPlus: { active: false } }, { merge: true });

  await syncClaims(params.uid, { premiumPlus: false });

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_plus_revoke",
    targetUid: params.uid,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Paid activation. Extends from the current expiry when the user is
// already premium, so renewals never lose days. Premium+ purchases also
// activate the premiumPlus entitlement. Source: subscription.
export async function activatePremiumForPayment(params: {
  uid: string;
  durationDays: number;
  reference: string;
  amountNaira: number;
  plan?: string;
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

  const isPremiumPlus = params.plan === "premium_plus";

  await ref.set(
    {
      premium: { active: true, expiresAtMs, source: "subscription" },
      premiumPlus: {
        active: isPremiumPlus ? true : (readPremiumPlus(snap.data(), now).active && false) || (isPremiumPlus ? true : readPremiumPlus(snap.data(), now).active),
        expiresAtMs: isPremiumPlus
          ? expiresAtMs
          : readPremiumPlus(snap.data(), now).expiresAtMs,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncClaims(params.uid, { premium: true });

  await db.collection("auditLogs").add({
    actorUid: params.uid,
    action: "premium_purchase",
    targetUid: params.uid,
    reference: params.reference,
    amountNaira: params.amountNaira,
    durationDays: params.durationDays,
    plan: params.plan ?? "unknown",
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("notifications").add({
    uid: params.uid,
    type: "premium_activated",
    title: isPremiumPlus ? "Premium+ activated" : "Premium activated",
    body: `Payment received. ${
      isPremiumPlus ? "Premium+" : "Premium"
    } is active until ${new Date(expiresAtMs).toLocaleDateString()}.`,
    link: "/profile",
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { expiresAtMs };
}