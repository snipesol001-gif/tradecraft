// Updates editable profile fields. Reuses the exact onboarding validators,
// so the rules never drift between onboarding and editing. Username is
// immutable in Phase 1 and any attempt is rejected explicitly. Only
// onboarded users can edit here; pre-completion edits go through the
// onboarding save route.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
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

const FIELD_VALIDATORS: Record<string, (v: unknown) => string | null> = {
  displayName: validateDisplayName,
  professionalTitle: validateProfessionalTitle,
  country: validateCountry,
  timezone: validateTimezone,
  services: validateServices,
  experienceLevel: validateExperienceLevel,
  yearsExperience: validateYearsExperience,
  portfolioUrl: validateOptionalUrl,
  websiteUrl: validateOptionalUrl,
  theme: (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (v === "light" || v === "dark" || v === "system") return null;
    return "Invalid theme.";
  },
};

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified) {
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }
  if (!sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "COMPLETE_ONBOARDING" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const patch =
    typeof body?.patch === "object" && body.patch !== null ? body.patch : {};

  if ("username" in (patch as Record<string, unknown>)) {
    return NextResponse.json(
      { ok: false, error: "USERNAME_IMMUTABLE", message: "Usernames cannot be changed right now." },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(patch as Record<string, unknown>)) {
    const validate = FIELD_VALIDATORS[field];
    if (!validate) {
      return NextResponse.json(
        { ok: false, error: "UNKNOWN_FIELD", field },
        { status: 400 }
      );
    }
    const problem = validate(value);
    if (problem) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", field, message: problem },
        { status: 400 }
      );
    }
    if (field === "yearsExperience") {
      if (value === "" || value === null || value === undefined) {
        update[field] = FieldValue.delete();
      } else {
        update[field] = Number(value);
      }
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" && (field === "portfolioUrl" || field === "websiteUrl")) {
        update[field] = FieldValue.delete();
      } else {
        update[field] = trimmed;
      }
    } else {
      update[field] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const db = getFirestore(getAdminApp());
  await db.collection("users").doc(sessionUser.uid).set(
    { ...update, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}