// Creates the session cookie. The client sends the Firebase ID token right
// after a successful sign-in, the server verifies it with admin power, then
// issues an httpOnly cookie. The cookie name __session is a Firebase-friendly
// convention. 14 days is Firebase's maximum session lifetime.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const idToken = body?.idToken;
    if (typeof idToken !== "string" || idToken.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing ID token." },
        { status: 400 }
      );
    }

    // Verifies the token against Firebase. Invalid or expired tokens throw.
    const sessionCookie = await getAuth(getAdminApp()).createSessionCookie(
      idToken,
      { expiresIn: SESSION_TTL_MS }
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
    return res;
    } catch (error) {
    // Logged server-side only, visible in Vercel's function logs, never
    // shown to users. This is how credential problems get diagnosed.
    console.error("[session] createSessionCookie failed:", error);
    return NextResponse.json(
      { ok: false, error: "Could not create a session from that token." },
      { status: 401 }
    );
  }
}