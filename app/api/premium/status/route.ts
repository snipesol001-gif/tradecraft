// Returns the caller's premium entitlements for UI decisions.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus } from "@/lib/premium";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const premium = await getPremiumStatus(sessionUser.uid);
  return NextResponse.json({
    ok: true,
    premium: premium.active,
    premiumPlus: false, // R2 activates this flag.
  });
}