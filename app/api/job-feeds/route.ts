// Job Feeds API: ranked, active opportunities from the ingested pool.
// This is the Job Feeds feature's own endpoint (secondary source, free
// to browse and save). Lazily triggers ingestion when the pool is stale,
// non-fatal on failure. Reports a missing composite index with its
// one-click creation URL instead of failing mysteriously.

import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { ingestIfDue } from "@/lib/ingest";

export const maxDuration = 60;

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_INCOMPLETE" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());

  await ingestIfDue().catch((err) => {
    console.error("[job-feeds] lazy ingest failed (non-fatal):", err);
  });

  let snap;
  try {
    snap = await db
      .collection("opportunities")
      .where("status", "==", "active")
      .orderBy("score", "desc")
      .orderBy("fetchedAt", "desc")
      .limit(60)
      .get();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[job-feeds] query failed:", msg);
    const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
    return NextResponse.json(
      {
        ok: false,
        error: match ? "MISSING_INDEX" : "FEED_QUERY_FAILED",
        indexUrl: match ? match[0] : null,
      },
      { status: 500 }
    );
  }

  const items = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: typeof d.title === "string" ? d.title : "Untitled",
      summary: typeof d.summary === "string" ? d.summary : "",
      url: typeof d.url === "string" ? d.url : "",
      sourceName: typeof d.sourceName === "string" ? d.sourceName : "",
      publishedAtMs:
        d.publishedAt && typeof d.publishedAt.toMillis === "function"
          ? d.publishedAt.toMillis()
          : null,
      score: typeof d.score === "number" ? d.score : 0,
      matchedServiceIds: Array.isArray(d.matchedServiceIds) ? d.matchedServiceIds : [],
      reasons: Array.isArray(d.reasons) ? d.reasons : [],
    };
  });

  return NextResponse.json({ ok: true, items });
}