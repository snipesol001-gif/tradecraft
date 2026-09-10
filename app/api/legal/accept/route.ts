// Records legal acceptance, one document at a time. The version is
// validated against the current version, so a crafted request cannot
// record a version that does not exist. Privacy acceptance also sets the
// "pv" custom claim, which is what the app gate reads from the session
// cookie without a database read.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal-content";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const document = body?.document;
  const version = typeof body?.version === "string" ? body.version : "";

  if (document !== "terms" && document !== "privacy") {
    return NextResponse.json({ ok: false, error: "INVALID_DOCUMENT" }, { status: 400 });
  }
  const current = document === "terms" ? TERMS_VERSION : PRIVACY_VERSION;
  if (version !== current) {
    return NextResponse.json({ ok: false, error: "VERSION_MISMATCH" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(sessionUser.uid);

  if (document === "terms") {
    await userRef.set(
      {
        legal: {
          acceptedTermsVersion: version,
          acceptedTermsAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  }

  await userRef.set(
    {
      legal: {
        acceptedPrivacyVersion: version,
        acceptedPrivacyAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );

  // setCustomUserClaims REPLACES all claims, so merge with what exists.
  const authUser = await getAuth(getAdminApp()).getUser(sessionUser.uid);
  await getAuth(getAdminApp()).setCustomUserClaims(sessionUser.uid, {
    ...authUser.customClaims,
    pv: true,
  });

  return NextResponse.json({ ok: true });
}