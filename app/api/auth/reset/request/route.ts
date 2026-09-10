// Requests a password reset code. The response is IDENTICAL whether or not
// the email has an account, so this endpoint cannot be used to discover
// which emails are registered. Rate limits are keyed by email for the same
// reason: real and fake addresses hit the same walls in the same order.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { generateCode, hashCode, todayUtc } from "@/lib/verification";
import { PASSWORD_RESET_RULES as RULES } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const now = Date.now();

  // Email-keyed limits. Counting happens even when no account exists,
  // so probing real and fake addresses is indistinguishable.
  const limitsRef = db.collection("passwordResetLimits").doc(email);
  const limitsSnap = await limitsRef.get();
  const limits = limitsSnap.data();

  if (limits?.lockedUntil && typeof limits.lockedUntil === "number" && limits.lockedUntil > now) {
    return NextResponse.json(
      {
        ok: false,
        error: "LOCKED",
        retryAfterSeconds: Math.ceil((limits.lockedUntil - now) / 1000),
      },
      { status: 429 }
    );
  }

  if (
    limits?.lastSentAt &&
    typeof limits.lastSentAt === "number" &&
    now - limits.lastSentAt < RULES.RESEND_COOLDOWN_SECONDS * 1000
  ) {
    const wait = Math.ceil(
      (RULES.RESEND_COOLDOWN_SECONDS * 1000 - (now - limits.lastSentAt)) / 1000
    );
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED", retryAfterSeconds: wait },
      { status: 429 }
    );
  }

  let sendsToday = typeof limits?.sendsToday === "number" ? limits.sendsToday : 0;
  if (limits?.sendsDate !== todayUtc()) sendsToday = 0;
  if (sendsToday >= RULES.DAILY_SEND_LIMIT) {
    return NextResponse.json({ ok: false, error: "DAILY_LIMIT" }, { status: 429 });
  }

  await limitsRef.set({
    lastSentAt: now,
    sendsToday: sendsToday + 1,
    sendsDate: todayUtc(),
  });

  // Account lookup happens AFTER the limits. No account? Return the same
  // success shape as the happy path. No email, no code, no difference.
  let user;
  try {
    user = await getAuth(getAdminApp()).getUserByEmail(email);
  } catch {
    return NextResponse.json({ ok: true });
  }

  // If this account is mid-lockout (from failed code attempts), the lockout
  // survives the new code. Returning normal success keeps the response
  // identical, while confirm stays blocked until the lockout expires.
  const prevSnap = await db.collection("passwordResets").doc(user.uid).get();
  const prev = prevSnap.data();
  let lockedUntil: number | null = null;
  if (prev?.lockedUntil && typeof prev.lockedUntil === "number" && prev.lockedUntil > now) {
    lockedUntil = prev.lockedUntil;
  }

  const code = generateCode();
  await db.collection("passwordResets").doc(user.uid).set({
    codeHash: hashCode(user.uid, code),
    createdAt: now,
    expiresAt: now + RULES.CODE_TTL_MINUTES * 60 * 1000,
    attempts: 0,
    lockedUntil,
    consumed: false,
  });

  await sendPasswordResetEmail({ to: email, code, minutesValid: RULES.CODE_TTL_MINUTES });

  return NextResponse.json({ ok: true });
}