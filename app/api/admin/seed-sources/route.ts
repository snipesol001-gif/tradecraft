// Seeds the sources catalog, idempotently, owner-only. Phase 7 replaces
// this with the admin panel. Authorization: the caller must be signed in
// AND their email must match the OWNER_EMAIL environment variable. This
// is a bootstrap guard for a development tool, not the final claim
// system (blueprint section 73).

import { NextRequest, NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { SEED_SOURCES } from "@/lib/sources";

export async function POST(_req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "NOT_OWNER" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());
  const existing = await db.collection("sources").count().get();
  if (existing.data().count > 0) {
    return NextResponse.json({
      ok: true,
      seeded: 0,
      note: `Catalog already has ${existing.data().count} sources. Nothing written.`,
    });
  }

  let seeded = 0;
  for (const s of SEED_SOURCES) {
    await db.collection("sources").doc(s.sourceId).set({
      name: s.name,
      type: s.type,
      url: s.url,
      siteUrl: s.siteUrl,
      category: s.category,
      tier: s.tier,
      cadenceHours: s.cadenceHours,
      active: true,
      health: {
        lastFetchedAt: null,
        lastStatus: "never_fetched",
        consecutiveFailures: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    seeded += 1;
  }

  return NextResponse.json({ ok: true, seeded });
}