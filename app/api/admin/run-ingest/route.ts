// Owner-triggered ingestion. ?force=1 ingests all sources regardless of
// cadence. Phase 7's admin panel replaces this bootstrap-style guard.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { runIngestion } from "@/lib/ingest";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "NOT_OWNER" }, { status: 403 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  try {
    const report = await runIngestion({ force });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("[ingest] failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}