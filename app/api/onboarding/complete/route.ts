// Completes onboarding. Re-validates EVERY required field server-side
// (never trust that earlier steps ran), then marks the account onboarded,
// sets the "onb" custom claim, ensures the referral code exists, and
// resolves the new member's own incoming referral (rewards fire exactly
// once, at this moment, by product decision).

import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { ensureReferralCode } from "@/lib/referral";
import { resolveReferralForUser } from "@/lib/referral-rewards";
import {
  validateDisplayName,
  validateProfessionalTitle,
  validateCountry,
  validateTimezone,
  validateServices,
  validateExperienceLevel,
  validateYearsExperience,
  validateOptionalUrl,
} from "@/lib/onboarding";

export async function POST() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified) {
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(sessionUser.uid);
  const snap = await ref.get();
  const d = snap.data() ?? {};

  if (d.onboarding?.status === "completed") {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  const checks: Array<
    [field: string, value: unknown, validate: (v: unknown) => string | null]
  > = [
    ["username", d.username, (v) => (typeof v === "string" && v.length > 0 ? null : "Claim a username first.")],
    ["displayName", d.displayName, validateDisplayName],
    ["professionalTitle", d.professionalTitle, validateProfessionalTitle],
    ["country", d.country, validateCountry],
    ["timezone", d.timezone, validateTimezone],
    ["services", d.services, validateServices],
    ["experienceLevel", d.experienceLevel, validateExperienceLevel],
    ["yearsExperience", d.yearsExperience, validateYearsExperience],
    ["portfolioUrl", d.portfolioUrl, validateOptionalUrl],
    ["websiteUrl", d.websiteUrl, validateOptionalUrl],
  ];

  for (const [field, value, validate] of checks) {
    const problem = validate(value);
    if (problem) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", field, message: problem },
        { status: 400 }
      );
    }
  }

  await ref.set(
    {
      onboarding: { status: "completed", completedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // setCustomUserClaims REPLACES all existing claims, so merge with what is
  // already there (for example "pv" from the privacy consent step).
  const authUser = await getAuth(getAdminApp()).getUser(sessionUser.uid);
  await getAuth(getAdminApp()).setCustomUserClaims(sessionUser.uid, {
    ...authUser.customClaims,
    onb: true,
  });

  // Every onboarded user gets a referral code (idempotent).
  await ensureReferralCode(sessionUser.uid);

  // Resolve the new member's own incoming referral, if any. Non-fatal:
  // onboarding completion must not fail because of a referral problem.
  const referredUsername = typeof d.username === "string" ? d.username : null;
  try {
    const resolution = await resolveReferralForUser(sessionUser.uid, referredUsername);
    console.log(`[referral] resolution for ${sessionUser.uid}: ${resolution.outcome}`);
  } catch (error) {
    console.error("[referral] resolution failed:", error);
  }

  return NextResponse.json({ ok: true });
}