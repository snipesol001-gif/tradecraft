// Completes a password reset. Verifies the code with the same hashing and
// attempt rules as email verification, sets the new password, and then
// REVOKES all of the account's sessions so any signed-in device (a stolen
// one included) is signed out at its next gated request.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { hashCode, codesMatch, todayUtc } from "@/lib/verification";
import { PASSWORD_RESET_RULES as RULES } from "@/lib/password-reset";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawCode = typeof body?.code === "string" ? body.code : "";
  const code = rawCode.replace(/\D/g, "");
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!EMAIL_PATTERN.test(email) || code.length !== 6) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "WEAK_PASSWORD" }, { status: 400 });
  }

  let user;
  try {
    user = await getAuth(getAdminApp()).getUserByEmail(email);
  } catch {
    // Generic rejection. Never reveal whether the address exists.
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("passwordResets").doc(user.uid);
  const snap = await ref.get();
  const data = snap.data();
  const now = Date.now();

  if (!data?.codeHash || data.consumed === true) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
  }

  if (data.lockedUntil && typeof data.lockedUntil === "number" && data.lockedUntil > now) {
    return NextResponse.json(
      {
        ok: false,
        error: "LOCKED",
        retryAfterSeconds: Math.ceil((data.lockedUntil - now) / 1000),
      },
      { status: 429 }
    );
  }

  if (typeof data.expiresAt === "number" && now > data.expiresAt) {
    return NextResponse.json({ ok: false, error: "CODE_EXPIRED" }, { status: 400 });
  }

  const storedHash = String(data.codeHash);

  if (codesMatch(storedHash, hashCode(user.uid, code))) {
    await getAuth(getAdminApp()).updateUser(user.uid, { password: newPassword });
    // Every existing session for this user dies here. The gate verifies
    // cookies against Firebase's revocation list, so protected pages and
    // API routes bounce all old sessions to login.
    await getAuth(getAdminApp()).revokeRefreshTokens(user.uid);
    await ref.set({ consumed: true }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  const attempts = typeof data.attempts === "number" ? data.attempts + 1 : 1;

  if (attempts >= RULES.MAX_ATTEMPTS) {
    const invalidToday =
      data.invalidationsDate === todayUtc()
        ? (typeof data.invalidationsToday === "number" ? data.invalidationsToday : 0) + 1
        : 1;
    const shouldLock = invalidToday >= RULES.MAX_INVALIDATIONS_PER_DAY;
    await ref.set(
      {
        attempts,
        invalidationsToday: invalidToday,
        invalidationsDate: todayUtc(),
        lockedUntil: shouldLock ? now + RULES.LOCKOUT_MINUTES * 60 * 1000 : null,
      },
      { merge: true }
    );
    if (shouldLock) {
      return NextResponse.json(
        { ok: false, error: "LOCKED", retryAfterSeconds: RULES.LOCKOUT_MINUTES * 60 },
        { status: 429 }
      );
    }
    return NextResponse.json({ ok: false, error: "CODE_INVALIDATED" }, { status: 400 });
  }

  await ref.set({ attempts }, { merge: true });
  return NextResponse.json(
    {
      ok: false,
      error: "CODE_INCORRECT",
      remainingAttempts: RULES.MAX_ATTEMPTS - attempts,
    },
    { status: 400 }
  );
}