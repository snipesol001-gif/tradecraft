// Returns the caller's credit state (two buckets) after applying any due
// daily reset. serverTime lets the client countdown correct for drift.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCreditState } from "@/lib/credits";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified) {
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  try {
    const state = await getCreditState(sessionUser.uid);
    return NextResponse.json({ ok: true, ...state, serverTime: Date.now() });
  } catch (error) {
    console.error("[credits] state failed:", error);
    return NextResponse.json({ ok: false, error: "CREDITS_UNAVAILABLE" }, { status: 500 });
  }
}