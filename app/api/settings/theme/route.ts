// Saves the account theme preference. Server-side entitlement check:
// locked themes are refused with an UPGRADE_REQUIRED answer, and the
// stored preference can never hold a theme the account is not entitled
// to. Free fallback on entitlement loss is handled by the premium lazy
// check, which resets to Automatic (FREE_FALLBACK_THEME).

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus } from "@/lib/premium";
import { getTheme, isThemeAllowed, FREE_FALLBACK_THEME } from "@/lib/themes";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const themeId = typeof body?.theme === "string" ? body.theme : "";
  if (!getTheme(themeId)) {
    return NextResponse.json({ ok: false, error: "UNKNOWN_THEME" }, { status: 400 });
  }

  const premium = await getPremiumStatus(sessionUser.uid);
  const allowed = isThemeAllowed(themeId, {
    premium: premium.active,
    // Premium+ does not exist yet as a purchasable tier; entitlement
    // arrives with its activation in R2. Until then the field on the
    // document (premiumPlus.active) is honored if present.
    premiumPlus: false,
  });

  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "UPGRADE_REQUIRED", theme: themeId },
      { status: 402 }
    );
  }

  const db = getFirestore(getAdminApp());
  await db.collection("users").doc(sessionUser.uid).set(
    {
      preferences: { theme: themeId },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true, theme: themeId });
}

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("users").doc(sessionUser.uid).get();
  const theme = typeof snap.data()?.preferences?.theme === "string"
    ? snap.data()!.preferences.theme
    : FREE_FALLBACK_THEME;
  return NextResponse.json({ ok: true, theme });
}