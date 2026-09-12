// Scheduled ingestion entry point. Vercel Cron calls this route daily
// (see vercel.json) and automatically attaches "Authorization: Bearer
// $CRON_SECRET" when a CRON_SECRET environment variable is defined in
// the project. Without that secret configured, this route refuses to
// run (honest 501) so an open URL can never trigger ingestion.

import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured. Ingestion is disabled." },
      { status: 501 }
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runIngestion({ force: false });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("[cron] ingestion failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}