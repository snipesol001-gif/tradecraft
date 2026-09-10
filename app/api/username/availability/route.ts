// Real-time availability check. Light, cheap, read-only. The authoritative
// check still happens inside the claim transaction, this endpoint only
// powers the friendly "available / taken" UI text.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { usernameError } from "@/lib/usernames";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(true);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const username = (req.nextUrl.searchParams.get("u") ?? "").trim().toLowerCase();
  const problem = usernameError(username);
  if (problem) {
    return NextResponse.json({ ok: true, status: "INVALID", message: problem });
  }

  const db = getFirestore(getAdminApp());

  const claimSnap = await db.collection("usernames").doc(username).get();
  if (claimSnap.exists) {
    return NextResponse.json({ ok: true, status: "TAKEN", message: "Username already taken" });
  }

  const reservedSnap = await db.collection("reserved_usernames").doc(username).get();
  if (reservedSnap.exists) {
    return NextResponse.json({ ok: true, status: "TAKEN", message: "Username already taken" });
  }

  return NextResponse.json({ ok: true, status: "AVAILABLE", message: "Username available" });
}