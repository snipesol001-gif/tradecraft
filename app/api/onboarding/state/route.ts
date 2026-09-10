// Returns the signed-in user's onboarding progress so the wizard can resume
// exactly where it stopped. Closing the browser loses nothing.

import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  if (!sessionUser.emailVerified) {
    return NextResponse.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());
  const snap = await db.collection("users").doc(sessionUser.uid).get();
  const d = snap.data() ?? {};
  const onboarding = (d.onboarding ?? {}) as { status?: string; lastStep?: number };

  return NextResponse.json({
    ok: true,
    status: onboarding.status ?? "not_started",
    lastStep: onboarding.lastStep ?? 1,
    username: typeof d.username === "string" ? d.username : null,
    data: {
      displayName: typeof d.displayName === "string" ? d.displayName : "",
      professionalTitle: typeof d.professionalTitle === "string" ? d.professionalTitle : "",
      country: typeof d.country === "string" ? d.country : "",
      timezone: typeof d.timezone === "string" ? d.timezone : "",
      services: Array.isArray(d.services) ? d.services : [],
      experienceLevel: typeof d.experienceLevel === "string" ? d.experienceLevel : "",
      yearsExperience: typeof d.yearsExperience === "number" ? d.yearsExperience : null,
      portfolioUrl: typeof d.portfolioUrl === "string" ? d.portfolioUrl : "",
      websiteUrl: typeof d.websiteUrl === "string" ? d.websiteUrl : "",
    },
  });
}