// Claims a username in a Firestore transaction, making duplicate claims
// structurally impossible: the document is both the lock and the record.
// Also writes the claim into the user's own profile document.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { usernameError } from "@/lib/usernames";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(true);
  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const problem = usernameError(username);
  if (problem) {
    return NextResponse.json({ ok: false, error: "INVALID", message: problem }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const claimRef = db.collection("usernames").doc(username);
  const userRef = db.collection("users").doc(user.uid);

  try {
    const claimedUsername = await db.runTransaction(async (tx) => {
      const claimSnap = await tx.get(claimRef);

      if (claimSnap.exists) {
        throw new Error("TAKEN");
      }

      const userSnap = await tx.get(userRef);
      if (userSnap.exists && userSnap.data()?.username) {
        throw new Error("ALREADY_CLAIMED");
      }

      tx.set(claimRef, {
        uid: user.uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        userRef,
        { username, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      return username;
    });

    return NextResponse.json({ ok: true, username: claimedUsername });
  } catch (err) {
    if (err instanceof Error && err.message === "TAKEN") {
      return NextResponse.json(
        { ok: false, error: "TAKEN", message: "Username already taken" },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message === "ALREADY_CLAIMED") {
      return NextResponse.json(
        { ok: false, error: "ALREADY_CLAIMED", message: "Your account already has a username." },
        { status: 409 }
      );
    }
    console.error("[username] claim failed:", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: "Could not claim that username. Please try again." },
      { status: 500 }
    );
  }
}