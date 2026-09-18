// Ends every admin session for the verified owner. The button in Login
// Security says "End all admin sessions", so this route ends all of
// them, then clears the current cookie, returning the browser to the
// entry screen.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession, destroyAllAdminSessions } from "@/lib/admin-auth";

export async function POST() {
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  const admin = await verifyAdminSession(ownerEmail);
  if (admin.ok) {
    await destroyAllAdminSessions(admin.uid);
  }
  // Whether or not a valid session existed, ensure the cookie is gone.
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}