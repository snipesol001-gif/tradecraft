// The admin console session layer. Separate from the user session by
// design: a dedicated short-lived cookie (tc_admin), issued only to the
// verified owner account. Door 2 (owner decision): the console opens on
// the authenticated owner session, no second password. The password
// machinery below is retained but dormant, for future hardening.
// Login security records (sign-in history, alerts) remain active.

import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebase-admin";

export const ADMIN_COOKIE_NAME = "tc_admin";
export const ADMIN_SESSION_TTL_S = 2 * 60 * 60; // 2 hours

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function adminSessionRef(token: string) {
  const db = getFirestore(getAdminApp());
  return db.collection("adminSessions").doc(hashToken(token));
}

export function isOwnerEmail(email: string | undefined | null): boolean {
  const owner = process.env.OWNER_EMAIL ?? "";
  return Boolean(owner) && Boolean(email) && owner.toLowerCase() === email!.toLowerCase();
}

// Issue the admin session for the verified owner.
export async function establishAdminSession(uid: string): Promise<{ maxAge: number }> {
  const token = randomBytes(32).toString("hex");
  await adminSessionRef(token).set({
    uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_S * 1000,
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_S,
  });
  return { maxAge: ADMIN_SESSION_TTL_S };
}

// Verifies the admin cookie against the live session record, expiry, and
// owner email. The email is read from Firebase Auth (the source of
// truth). The users document never stores an email field, which is
// exactly why the first version of this check failed and 404'd.
export async function verifyAdminSession(
  ownerEmail: string
): Promise<{ ok: true; uid: string } | { ok: false; reason: "NO_SESSION" | "NOT_OWNER" }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return { ok: false, reason: "NO_SESSION" };
  }
  const snap = await adminSessionRef(token).get();
  if (!snap.exists) {
    return { ok: false, reason: "NO_SESSION" };
  }
  const d = snap.data();
  if (typeof d.expiresAt !== "number" || d.expiresAt < Date.now()) {
    return { ok: false, reason: "NO_SESSION" };
  }
  try {
    const user = await getAuth(getAdminApp()).getUser(d.uid);
    const email = (user.email ?? "").toLowerCase();
    if (email !== ownerEmail.toLowerCase()) {
      return { ok: false, reason: "NOT_OWNER" };
    }
  } catch {
    // Account deleted or lookup failed: the session cannot be trusted.
    return { ok: false, reason: "NOT_OWNER" };
  }
  return { ok: true, uid: d.uid as string };
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (token) {
    await adminSessionRef(token).delete();
  }
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// Ends every admin session for this owner (used after security changes).
export async function destroyAllAdminSessions(uid: string): Promise<void> {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("adminSessions").where("uid", "==", uid).get();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

// ---------------------------------------------------------------------
// DORMANT: password machinery, retained for future hardening (Door 1).
// Not called anywhere while Door 2 is active.
// ---------------------------------------------------------------------

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;

function loginStateRef(uid: string) {
  const db = getFirestore(getAdminApp());
  return db.collection("adminLoginState").doc(uid);
}

export async function isLockedOut(uid: string) {
  const snap = await loginStateRef(uid).get();
  const lockedUntil = typeof snap.data()?.lockedUntil === "number" ? snap.data()!.lockedUntil : 0;
  const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
  return { locked: lockedUntil > Date.now(), remainingSeconds: Math.max(0, remaining) };
}

export async function registerAdminFailure(uid: string) {
  const ref = loginStateRef(uid);
  const snap = await ref.get();
  const now = Date.now();
  const d = snap.data() ?? {};
  const windowStart = typeof d.failureWindowStart === "number" ? d.failureWindowStart : 0;
  const inWindow = now - windowStart < FAILURE_WINDOW_MS;
  const failures = inWindow ? (typeof d.failures === "number" ? d.failures : 0) + 1 : 1;
  const locked = failures >= MAX_FAILURES;
  await ref.set(
    {
      failures,
      failureWindowStart: inWindow ? windowStart : now,
      lockedUntil: locked ? now + LOCKOUT_MINUTES * 60 * 1000 : 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { locked, lockRemainingSeconds: locked ? LOCKOUT_MINUTES * 60 : 0 };
}

export async function clearAdminFailures(uid: string): Promise<void> {
  await loginStateRef(uid).set(
    { failures: 0, failureWindowStart: 0, lockedUntil: 0, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}