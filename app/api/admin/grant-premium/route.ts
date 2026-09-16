// Admin grant/revoke of Premium by email. Owner-email-guarded until the
// Phase 7 admin panel. The target user's session picks up the claim on
// next sign-in or token refresh.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { grantPremium, revokePremium } from "@/lib/premium";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "NOT_OWNER" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const action = body?.action === "grant" || body?.action === "revoke" ? body.action : "";
  const durationDays =
    typeof body?.durationDays === "number" && body.durationDays > 0 ? body.durationDays : null;
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : "";

  if (!email || !action || !reason) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", note: "email, action (grant|revoke), and reason are required." },
      { status: 400 }
    );
  }

  try {
    const target = await getAuth(getAdminApp()).getUserByEmail(email);
    if (action === "grant") {
      await grantPremium({
        uid: target.uid,
        actorUid: sessionUser.uid,
        durationDays,
        reason,
      });
      return NextResponse.json({
        ok: true,
        action: "granted",
        uid: target.uid,
        durationDays,
      });
    }
    await revokePremium({ uid: target.uid, actorUid: sessionUser.uid, reason });
    return NextResponse.json({ ok: true, action: "revoked", uid: target.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("no user record")) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }
    console.error("[premium] admin action failed:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}