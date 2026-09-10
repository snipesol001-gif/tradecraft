// Checks a submitted code. Enforces expiry, attempt limits, and lockout.
// On success it flips the real emailVerified flag on the Firebase user.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { hashCode, codesMatch, todayUtc, VERIFICATION_RULES } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(true);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const body = await req.json().catch(() => null);
  const raw = typeof body?.code === "string" ? body.code : "";
  const code = raw.replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("emailVerifications").doc(user.uid);
  const snap = await ref.get();
  const data = snap.data();
  const now = Date.now();

  if (!data?.codeHash || data.consumed === true) {
    return NextResponse.json({ ok: false, error: "NO_ACTIVE_CODE" }, { status: 400 });
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
    // The real verification: Firebase itself now marks this user verified.
    await getAuth(getAdminApp()).updateUser(user.uid, { emailVerified: true });
    await ref.set({ consumed: true }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  const attempts = typeof data.attempts === "number" ? data.attempts + 1 : 1;

  if (attempts >= VERIFICATION_RULES.MAX_ATTEMPTS) {
    const invalidToday =
      data.invalidationsDate === todayUtc()
        ? (typeof data.invalidationsToday === "number" ? data.invalidationsToday : 0) + 1
        : 1;
    const shouldLock = invalidToday >= VERIFICATION_RULES.MAX_INVALIDATIONS_PER_DAY;
    await ref.set(
      {
        attempts,
        invalidationsToday: invalidToday,
        invalidationsDate: todayUtc(),
        lockedUntil: shouldLock ? now + VERIFICATION_RULES.LOCKOUT_MINUTES * 60 * 1000 : null,
      },
      { merge: true }
    );
    if (shouldLock) {
      return NextResponse.json(
        {
          ok: false,
          error: "LOCKED",
          retryAfterSeconds: VERIFICATION_RULES.LOCKOUT_MINUTES * 60,
        },
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
      remainingAttempts: VERIFICATION_RULES.MAX_ATTEMPTS - attempts,
    },
    { status: 400 }
  );
}