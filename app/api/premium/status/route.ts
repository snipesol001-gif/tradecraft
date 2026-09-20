// Returns the caller's entitlements for UI decisions.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus, getPremiumPlusStatus } from "@/lib/premium";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const premium = await getPremiumStatus(sessionUser.uid);
  const plus = await getPremiumPlusStatus(sessionUser.uid);
  return NextResponse.json({
    ok: true,
    premium: premium.active,
    premiumPlus: plus.active,
  });
}