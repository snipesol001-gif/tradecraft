// Updates a lead's status or notes. Ownership is enforced server-side:
// the document ID embeds the uid, and the update verifies it before
// writing. No credits are involved in lead management, ever.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";

const STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "replied",
  "negotiating",
  "won",
  "lost",
  "archived",
] as const;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const notes = typeof body?.notes === "string" ? body.notes : "";

  if (!leadId || leadId.length > 200) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  // The lead id is `${uid}_${opportunityId}`: any lead not owned by the
  // caller simply will not match, but we also verify the stored uid.
  if (!leadId.startsWith(`${sessionUser.uid}_`)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
  }
  if (notes.length > 5000) {
    return NextResponse.json({ ok: false, error: "NOTES_TOO_LONG" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const ref = db.collection("userLeads").doc(leadId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== sessionUser.uid) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status) update.status = status;
  if (body && "notes" in (body as Record<string, unknown>)) {
    update.notes = notes;
  }

  await ref.set(update, { merge: true });
  return NextResponse.json({ ok: true });
}