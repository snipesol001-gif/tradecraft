// Issues a verification code for the signed-in user. Enforces lockout,
// resend cooldown, and the daily send limit, then stores only the hash.

import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { generateCode, hashCode, todayUtc, VERIFICATION_RULES } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const user = await getSessionUser(true);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("emailVerifications").doc(user.uid);
  const snap = await ref.get();
  const data = snap.data();
  const now = Date.now();

  if (data?.lockedUntil && typeof data.lockedUntil === "number" && data.lockedUntil > now) {
    return NextResponse.json(
      {
        ok: false,
        error: "LOCKED",
        retryAfterSeconds: Math.ceil((data.lockedUntil - now) / 1000),
      },
      { status: 429 }
    );
  }

  if (
    data?.lastSentAt &&
    typeof data.lastSentAt === "number" &&
    now - data.lastSentAt < VERIFICATION_RULES.RESEND_COOLDOWN_SECONDS * 1000
  ) {
    const wait = Math.ceil(
      (VERIFICATION_RULES.RESEND_COOLDOWN_SECONDS * 1000 - (now - data.lastSentAt)) / 1000
    );
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED", retryAfterSeconds: wait },
      { status: 429 }
    );
  }

  let sendsToday = typeof data?.sendsToday === "number" ? data.sendsToday : 0;
  if (data?.sendsDate !== todayUtc()) {
    sendsToday = 0;
  }
  if (sendsToday >= VERIFICATION_RULES.DAILY_SEND_LIMIT) {
    return NextResponse.json({ ok: false, error: "DAILY_LIMIT" }, { status: 429 });
  }

  const code = generateCode();

  await ref.set({
    codeHash: hashCode(user.uid, code),
    createdAt: now,
    expiresAt: now + VERIFICATION_RULES.CODE_TTL_MINUTES * 60 * 1000,
    attempts: 0,
    lastSentAt: now,
    sendsToday: sendsToday + 1,
    sendsDate: todayUtc(),
    lockedUntil: null,
    consumed: false,
  });

  const result = await sendVerificationEmail({
    to: user.email ?? "",
    code,
    minutesValid: VERIFICATION_RULES.CODE_TTL_MINUTES,
  });

  return NextResponse.json({
    ok: true,
    delivered: result.sent,
    reason: result.skippedReason ?? null,
    cooldownSeconds: VERIFICATION_RULES.RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: VERIFICATION_RULES.CODE_TTL_MINUTES,
  });
}