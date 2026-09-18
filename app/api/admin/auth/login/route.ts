// Opens the admin console for the verified owner. Door 2: the caller
// must hold a valid signed-in owner session; the admin cookie is issued
// from that proof. No second password under this mode.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { establishAdminSession, isOwnerEmail } from "@/lib/admin-auth";

export async function POST() {
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 501 });
  }

  const sessionUser = await getSessionUser(true);
  if (
    !sessionUser ||
    !isOwnerEmail(sessionUser.email) ||
    sessionUser.email!.toLowerCase() !== ownerEmail.toLowerCase()
  ) {
    return NextResponse.json(
      { ok: false, error: "Sign in to TradeCraft as the owner account first." },
      { status: 403 }
    );
  }

  await establishAdminSession(sessionUser.uid);
  return NextResponse.json({ ok: true });
}