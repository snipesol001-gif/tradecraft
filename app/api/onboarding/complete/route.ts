// Completes onboarding. Re-validates EVERY required field server-side
// (never trust that earlier steps ran), then marks the account onboarded
// and sets the "onb" custom claim. That claim is what the app gate reads;
// the client refreshes its session right after this succeeds, so the fresh
// cookie carries it.

import { ensureReferralCode } from "@/lib/referral";
import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
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
  // Every onboarded user gets a referral code. Placed before the completed
  // check, so re-calling complete also ensures the code exists. That is how
  // accounts which completed onboarding earlier get theirs.
  await ensureReferralCode(sessionUser.uid);

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

  // Note for later phases: setCustomUserClaims REPLACES all existing custom
  // claims. Any claim added in future phases must be set together here.
  await getAuth(getAdminApp()).setCustomUserClaims(sessionUser.uid, { onb: true });

  return NextResponse.json({ ok: true });
}