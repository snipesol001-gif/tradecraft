// Captures a referral attribution. Phase 1 hook: creates the referral
// record with status 'pending' and snapshots the request signals (hashed
// IP and user agent) for the Phase 2 anti-abuse engine. No rewards are
// granted here, ever. Exactly-once is structural: the referral document
// ID is the referred user's UID, and create() fails if it already exists.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import {
  isValidReferralCodeFormat,
  normalizeReferralCode,
  ATTRIBUTION_WINDOW_MS,
} from "@/lib/referral";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawCode = typeof body?.code === "string" ? body.code : "";
  const code = normalizeReferralCode(rawCode);

  // Captures report honest reasons but never hard-fail the signup flow.
  const fail = (reason: string) =>
    NextResponse.json({ ok: true, captured: false, reason });

  if (!isValidReferralCodeFormat(code)) return fail("INVALID_CODE");

  // Only fresh accounts can be attributed.
  try {
    const authUser = await getAuth(getAdminApp()).getUser(sessionUser.uid);
    const createdAt = new Date(authUser.metadata.creationTime).getTime();
    if (Date.now() - createdAt > ATTRIBUTION_WINDOW_MS) {
      return fail("ATTRIBUTION_WINDOW_PASSED");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }

  // Snapshot signals for Phase 2 anti-abuse. The IP is hashed immediately
  // and never stored raw. The verification secret doubles as the hash
  // pepper for now; Phase 2 may move this to a dedicated secret.
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "unknown";
  const ua = (req.headers.get("user-agent") ?? "unknown").slice(0, 300);
  const ipHash = createHash("sha256")
    .update(`${ip}:${process.env.VERIFICATION_CODE_SECRET ?? ""}`)
    .digest("hex");

  const db = getFirestore(getAdminApp());
  const codeRef = db.collection("referralCodes").doc(code);
  const referralRef = db.collection("referrals").doc(sessionUser.uid);
  const userRef = db.collection("users").doc(sessionUser.uid);

  try {
    await db.runTransaction(async (tx) => {
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists) throw new Error("INVALID_CODE");
      const referrerUid = codeSnap.data()?.uid;
      if (typeof referrerUid !== "string") throw new Error("INVALID_CODE");
      if (referrerUid === sessionUser.uid) throw new Error("SELF_REFERRAL");

      // create() fails when this referral already exists: exactly-once.
      tx.create(referralRef, {
        referrerUid,
        referredUid: sessionUser.uid,
        code,
        status: "pending",
        ipHash,
        ua,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Shallow-merge note: merge:true replaces the whole nested 'referral'
      // map, it does not deep-merge. Capture is the only writer while the
      // map is still empty, so this is safe here. The Phase 2 engine must
      // read, modify, and write the map as a whole.
      tx.set(
        userRef,
        {
          referral: {
            referredBy: referrerUid,
            referredByCode: code,
            capturedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    });
    return NextResponse.json({ ok: true, captured: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "INVALID_CODE") return fail("INVALID_CODE");
    if (msg === "SELF_REFERRAL") return fail("SELF_REFERRAL");
    if (msg.toLowerCase().includes("already exists")) return fail("ALREADY_ATTRIBUTED");
    console.error("[referral] capture failed:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}