// Validates a referral code's format and existence. Read-only, no auth
// required: the signup form checks codes before an account even exists.
// This reveals only whether an 8-character code was ever issued, which is
// the same information anyone gains by attempting signup with it.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { isValidReferralCodeFormat, normalizeReferralCode } from "@/lib/referral";

export async function GET(req: NextRequest) {
  const code = normalizeReferralCode(req.nextUrl.searchParams.get("code") ?? "");
  if (!isValidReferralCodeFormat(code)) {
    return NextResponse.json({ ok: true, valid: false, reason: "INVALID_FORMAT" });
  }
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("referralCodes").doc(code).get();
  return NextResponse.json({ ok: true, valid: snap.exists });
}