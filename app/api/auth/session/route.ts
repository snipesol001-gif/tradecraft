// Creates the session cookie and records the sign-in for security.
//
// Security records (per owner requirement):
//  - loginEvents/{id}: an append-only sign-in history entry. Server-only
//    collection, no client rules, no delete code path anywhere.
//  - a security_login notification: visually distinct in the notification
//    center, mark-read only, never deletable.
// The IP is hashed before storage. Raw IPs are never stored.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";
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

    const adminAuth = getAuth(getAdminApp());

    // Verify first: gives the decoded user for the security record.
    const decoded = await adminAuth.verifyIdToken(idToken);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_TTL_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });

    // Security records. Written after the cookie is issued so a logging
    // failure can never block a legitimate sign-in.
    try {
      const db = getFirestore(getAdminApp());
      const fwd = req.headers.get("x-forwarded-for") ?? "";
      const ip = fwd.split(",")[0]?.trim() || "unknown";
      const ipHash = createHash("sha256")
        .update(`${ip}:${process.env.VERIFICATION_CODE_SECRET ?? ""}`)
        .digest("hex");
      const ua = (req.headers.get("user-agent") ?? "unknown").slice(0, 300);
      const provider =
        decoded.firebase?.sign_in_provider === "google.com"
          ? "Google"
          : "Email and password";

      await db.collection("loginEvents").add({
        uid: decoded.uid,
        provider,
        ipHash,
        userAgent: ua,
        createdAt: FieldValue.serverTimestamp(),
      });

      await db.collection("notifications").add({
        uid: decoded.uid,
        type: "security_login",
        title: "New sign-in to your account",
        body: `Signed in via ${provider}. If this was you, no action is needed. Security sign-in records are permanent.`,
        link: "/profile",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logErr) {
      console.error("[session] security record failed (non-fatal):", logErr);
    }

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create a session from that token." },
      { status: 401 }
    );
  }
}