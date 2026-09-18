// Changes the owner account password from inside the admin console.
// Requires: an active admin session, the current password, a new
// password meeting strength rules, and confirmation match. On success,
// every admin session is destroyed (re-login required) and the owner is
// notified.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import {
  destroyAllAdminSessions,
  verifyAdminSession,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail) {
    return NextResponse.json({ ok: false, error: "Admin is not configured." }, { status: 501 });
  }

  const admin = await verifyAdminSession(ownerEmail);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "Admin session required." }, { status: 401 });
  }
  const uid = admin.uid;

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "All three password fields are required." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "New passwords do not match." },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Server misconfiguration." }, { status: 500 });
  }

  const email = ownerEmail.toLowerCase();

  // Step 1: prove the current password (Identity Toolkit).
  try {
    const check = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: currentPassword, returnSecureToken: false }),
      }
    );
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: "Current password is incorrect." },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not verify the current password right now." },
      { status: 502 }
    );
  }

  // Step 2: change the password via the Admin SDK.
  try {
    await getAuth(getAdminApp()).updateUser(uid, { password: newPassword });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("password")) {
      return NextResponse.json(
        { ok: false, error: "That new password was rejected. Try a stronger one." },
        { status: 400 }
      );
    }
    console.error("[admin] password change failed:", err);
    return NextResponse.json({ ok: false, error: "Password change failed." }, { status: 500 });
  }

  // Step 3: revoke refresh tokens (kills other user sessions) and all
  // admin sessions (this console included, by design).
  await getAuth(getAdminApp()).revokeRefreshTokens(uid);
  await destroyAllAdminSessions(uid);

  // Step 4: notify and audit.
  try {
    const db = getFirestore(getAdminApp());
    await db.collection("notifications").add({
      uid,
      type: "security_password_changed",
      title: "Admin password changed",
      body: "The admin console password was changed and all sessions were signed out.",
      link: "/admin/login",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.collection("auditLogs").add({
      actorUid: uid,
      action: "admin_password_change",
      reason: "Password changed from admin console",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-fatal.
  }

  return NextResponse.json({ ok: true, note: "All sessions signed out. Sign in again." });
}