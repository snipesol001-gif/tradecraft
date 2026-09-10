// Saves one onboarding step's fields to the user document. Every step is
// validated server-side with the same rules the forms use, so a crafted
// request cannot store junk. Steps can be saved in any order and re-saved
// until onboarding is completed. After completion, edits happen through the
// profile page (a later step), not this route.
//
// Firestore note: in set(), a key containing a dot is written as a literal
// field name, not as a nested path. Nested fields must be expressed as
// nested objects. That is why progress is updated with a nested
// onboarding object instead of "onboarding.status".

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { STEP_VALIDATORS } from "@/lib/onboarding";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified) {
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const step = typeof body?.step === "number" ? body.step : NaN;
  const patch =
    typeof body?.patch === "object" && body.patch !== null ? body.patch : {};

  const validators = STEP_VALIDATORS[step];
  if (!validators) {
    return NextResponse.json({ ok: false, error: "INVALID_STEP" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("users").doc(sessionUser.uid);
  const snap = await ref.get();
  if (snap.data()?.onboarding?.status === "completed") {
    return NextResponse.json({ ok: false, error: "ALREADY_COMPLETED" }, { status: 409 });
  }

  const fields: Record<string, unknown> = {};

  for (const [field, validate] of validators) {
    const value = (patch as Record<string, unknown>)[field];
    const problem = validate(value);
    if (problem) {
      return NextResponse.json(
        { ok: false, error: "VALIDATION", field, message: problem },
        { status: 400 }
      );
    }
    if (field === "yearsExperience") {
      // Optional number: an empty value removes the stored field entirely.
      if (value === "" || value === null || value === undefined) {
        fields[field] = FieldValue.delete();
      } else {
        fields[field] = Number(value);
      }
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      // Optional URL fields: an empty value removes the stored field.
      if (trimmed === "" && (field === "portfolioUrl" || field === "websiteUrl")) {
        fields[field] = FieldValue.delete();
      } else {
        fields[field] = trimmed;
      }
    } else {
      fields[field] = value;
    }
  }

  // set() with merge updates exactly the given fields and preserves the
  // rest of the document. Progress goes in as a nested object (see the
  // note at the top of this file).
  await ref.set(
    {
      ...fields,
      onboarding: { status: "in_progress", lastStep: step },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}