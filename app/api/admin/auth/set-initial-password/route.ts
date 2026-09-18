// One-time bootstrap: sets a password on an owner account that signed up
// with Google and has no password. This is sensitive, so it requires:
//  - a signed-in session matching OWNER_EMAIL
//  - a FRESH sign-in: the client sends a force-refreshed ID token and the
//    route verifies auth_time is within the last 10 minutes
//  - new password + confirmation, minimum 8 characters
// On success: audit log, security notification. Google sign-in continues
// to work as before; email and password sign-in becomes available too.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";

const MAX_AUTH_AGE_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 501 });
  }

  const sessionUser = await getSessionUser(true);
  if (!sessionUser || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Owner session required." }, { status: 403 });
  }
  const uid = sessionUser.uid;

  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!idToken || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "idToken, newPassword, and confirmPassword are required." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
  }

  // Verify the fresh token and check sign-in recency.
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken, true);
    if (decoded.uid !== uid) {
      return NextResponse.json({ ok: false, error: "Token does not match the session." }, { status: 403 });
    }
    const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time * 1000 : 0;
    if (!authTime || Date.now() - authTime > MAX_AUTH_AGE_MS) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Your sign-in is too old for this sensitive action. Sign out, sign in with Google again, then set the password immediately.",
        },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not verify your fresh sign-in. Sign in again and retry." },
      { status: 401 }
    );
  }

  // The account must genuinely have no password yet.
  const user = await getAuth(getAdminApp()).getUser(uid);
  if (user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "This account already has a password. Use change password instead." },
      { status: 409 }
    );
  }

  try {
    await getAuth(getAdminApp()).updateUser(uid, { password: newPassword });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("password")) {
      return NextResponse.json(
        { ok: false, error: "That password was rejected. Try a stronger one." },
        { status: 400 }
      );
    }
    console.error("[admin] set initial password failed:", err);
    return NextResponse.json({ ok: false, error: "Password setup failed." }, { status: 500 });
  }

  try {
    const db = getFirestore(getAdminApp());
    await db.collection("auditLogs").add({
      actorUid: uid,
      action: "admin_password_set",
      reason: "Initial admin password set for a Google-only owner account",
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.collection("notifications").add({
      uid,
      type: "security_password_set",
      title: "Admin password created",
      body: "A password was set on your owner account. Email and password sign-in is now available alongside Google.",
      link: "/admin/login",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-fatal.
  }

  return NextResponse.json({ ok: true });
}