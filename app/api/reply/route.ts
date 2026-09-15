// Generates a suggested reply for an opportunity. Uses the caller's own
// profile context server-side (the client never supplies identity), and
// never sends anything anywhere: the draft is returned for manual copy.

import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";
import { isAIConfigured, generateSuggestedReply } from "@/lib/ai";
import { SERVICES } from "@/lib/services";

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified || !sessionUser.onboarded) {
    return NextResponse.json({ ok: false, error: "ONBOARDING_INCOMPLETE" }, { status: 403 });
  }
  if (!isAIConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI_NOT_CONFIGURED", note: "AI features are not configured yet." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId : "";
  if (!opportunityId || opportunityId.length > 120) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const [userSnap, oppSnap] = await Promise.all([
    db.collection("users").doc(sessionUser.uid).get(),
    db.collection("opportunities").doc(opportunityId).get(),
  ]);

  if (!oppSnap.exists) {
    return NextResponse.json({ ok: false, error: "OPPORTUNITY_NOT_FOUND" }, { status: 404 });
  }
  const user = userSnap.data() ?? {};
  const opp = oppSnap.data()!;

  const displayName = typeof user.displayName === "string" ? user.displayName : "";
  const professionalTitle =
    typeof user.professionalTitle === "string" ? user.professionalTitle : "";
  const portfolioUrl = typeof user.portfolioUrl === "string" ? user.portfolioUrl : null;
  const serviceIds = Array.isArray(user.services) ? (user.services as string[]) : [];
  const matched = Array.isArray(opp.matchedServiceIds) ? (opp.matchedServiceIds as string[]) : [];
  const relevantIds = matched.length > 0 ? matched : serviceIds;
  const relevantServiceLabels = relevantIds
    .map((id) => SERVICES.find((s) => s.id === id)?.label ?? id)
    .slice(0, 3);

  const result = await generateSuggestedReply({
    displayName: displayName || "a TradeCraft member",
    professionalTitle: professionalTitle || "freelance professional",
    relevantServiceLabels:
      relevantServiceLabels.length > 0 ? relevantServiceLabels : ["professional services"],
    portfolioUrl,
    postTitle: typeof opp.title === "string" ? opp.title : "",
    postBody: typeof opp.summary === "string" ? opp.summary : "",
    platformName: typeof opp.sourceName === "string" ? opp.sourceName : "the original platform",
  });

  if (!result.ok) {
    console.error("[reply] generation failed:", result.error);
    return NextResponse.json(
      {
        ok: false,
        error: result.error === "AI_NOT_CONFIGURED" ? "AI_NOT_CONFIGURED" : "GENERATION_FAILED",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, message: result.result.message });
}