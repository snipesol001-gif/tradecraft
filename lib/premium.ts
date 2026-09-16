// The Premium entitlement system. Server-side only.
//
// Source of truth: users/{uid}.premium.active plus premium.expiresAt.
// The custom claim premium:true mirrors the document for fast gating,
// but every durable check re-reads the document (claims are a hint,
// the document is the truth, blueprint section 73).
//
// Expiry is lazy: any check that finds an expired grant flips it off in
// the same operation (the proven credits-reset pattern). Admin grants
// and revokes are audit-logged.

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

// The durable check. Reads the document, lazily expires stale grants,
// syncs the custom claim when the state changes, and returns the truth.
export async function getPremiumStatus(uid: string): Promise<PremiumStatus> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const now = Date.now();
  const status = readPremium(snap.data(), now);

  if (snap.data()?.premium?.active === true && status.active === false) {
    // The stored grant expired: flip it off in place and sync the claim.
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

// For use inside an existing transaction: read-only evaluation, no
// writes. Callers handle their own claim syncing.
export function evaluatePremium(
  data: Record<string, unknown> | undefined,
  nowMs: number
): boolean {
  return readPremium(data, nowMs).active;
}

// Admin grant. Sets document fields, the claim, and writes an audit
// record. durationDays: null means no expiry.
export async function grantPremium(params: {
  uid: string;
  actorUid: string;
  durationDays: number | null;
  reason: string;
}): Promise<void> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(params.uid);
  const expiresAtMs =
    params.durationDays === null ? null : Date.now() + params.durationDays * 24 * 60 * 60 * 1000;

  await ref.set(
    {
      premium: {
        active: true,
        expiresAtMs,
        source: "admin",
      },
      premiumGrantedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const authUser = await getAuth(getAdminApp()).getUser(params.uid);
  await getAuth(getAdminApp()).setCustomUserClaims(params.uid, {
    ...authUser.customClaims,
    premium: true,
  });

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

// Admin revoke. Clears fields, the claim, and writes an audit record.
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

  const authUser = await getAuth(getAdminApp()).getUser(params.uid);
  await getAuth(getAdminApp()).setCustomUserClaims(params.uid, {
    ...authUser.customClaims,
    premium: false,
  });

  await db.collection("auditLogs").add({
    actorUid: params.actorUid,
    action: "premium_revoke",
    targetUid: params.uid,
    reason: params.reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}