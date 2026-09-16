// The Website Analyzer run endpoint. Premium-gated server-side: the
// document check is authoritative, the claim is only a hint. Free users
// get an honest 403 with an upgrade note. Runs are recorded whether
// they succeed or fail.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus } from "@/lib/premium";
import { runAnalyzer } from "@/lib/analyzer";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_INCOMPLETE" }, { status: 403 });
  }

  // The durable Premium check: document truth, not just the claim.
  const premium = await getPremiumStatus(sessionUser.uid);
  if (!premium.active) {
    return NextResponse.json(
      {
        ok: false,
        error: "PREMIUM_REQUIRED",
        note: "The Website Analyzer is a Premium feature. Explore Premium to see what it unlocks.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ ok: false, error: "Paste a website URL to analyze." }, { status: 400 });
  }

  const result = await runAnalyzer({ uid: sessionUser.uid, url });
  if (!result.ok) {
    const status = result.status ?? (result.error.includes("https://") ? 400 : 502);
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    runId: result.run.runId,
    url: result.run.finalUrl,
    result: result.run.result,
    extraction: {
      title: result.run.extraction.title,
      wordCount: result.run.extraction.wordCount,
      headings: result.run.extraction.headings.slice(0, 10),
    },
  });
}