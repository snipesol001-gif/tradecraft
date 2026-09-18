// Leads: create (always FREE per the authoritative credit rules) and
// list. The lead document ID is uid + opportunity id, so saving the same
// opportunity twice is structurally impossible. Leads store a snapshot
// so the entry stays useful even if the original post changes later.
// No credits are involved in lead saving, ever.

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_INCOMPLETE" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const oppId = typeof body?.opportunityId === "string" ? body.opportunityId : "";
  if (!oppId || oppId.length > 120) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const uid = sessionUser.uid;
  const leadRef = db.collection("userLeads").doc(`${uid}_${oppId}`);
  const oppRef = db.collection("opportunities").doc(oppId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [leadSnap, oppSnap] = await Promise.all([tx.get(leadRef), tx.get(oppRef)]);

      if (leadSnap.exists) {
        return { duplicate: true as const };
      }
      if (!oppSnap.exists) {
        throw new Error("OPPORTUNITY_NOT_FOUND");
      }
      const opp = oppSnap.data()!;
      const publishedMs =
        opp.publishedAt && typeof opp.publishedAt.toMillis === "function"
          ? opp.publishedAt.toMillis()
          : null;

      tx.create(leadRef, {
        uid,
        opportunityId: oppId,
        status: "new",
        notes: "",
        snapshot: {
          title: typeof opp.title === "string" ? opp.title : "Untitled",
          summary: typeof opp.summary === "string" ? opp.summary : "",
          url: typeof opp.url === "string" ? opp.url : "",
          sourceName: typeof opp.sourceName === "string" ? opp.sourceName : "",
          score: typeof opp.score === "number" ? opp.score : 0,
          publishedAtMs: publishedMs,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        duplicate: false as const,
        opportunity: {
          id: oppId,
          title: typeof opp.title === "string" ? opp.title : "Untitled",
          url: typeof opp.url === "string" ? opp.url : "",
        },
      };
    });

    if (result.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: true, duplicate: false, lead: result.opportunity });
  } catch (err) {
    if (err instanceof Error && err.message === "OPPORTUNITY_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "OPPORTUNITY_NOT_FOUND" }, { status: 404 });
    }
    console.error("[leads] create failed:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const db = getFirestore(getAdminApp());
  let snap;
  try {
    snap = await db
      .collection("userLeads")
      .where("uid", "==", sessionUser.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[leads] list query failed:", msg);
    const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
    return NextResponse.json(
      {
        ok: false,
        error: match ? "MISSING_INDEX" : "LEADS_QUERY_FAILED",
        indexUrl: match ? match[0] : null,
      },
      { status: 500 }
    );
  }
  const leads = snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      opportunityid: typeof v.opportunityid === "string" ? v.opportunityid : "",
      status: typeof v.status === "string" ? v.status : "new",
      notes: typeof v.notes === "string" ? v.notes : "",
      createdAtMs:
        v.createdAt && typeof v.createdAt.toMillis === "function"
          ? v.createdAt.toMillis()
          : null,
      snapshot: v.snapshot ?? {},
    };
  });
  return NextResponse.json({ ok: true, leads });
}