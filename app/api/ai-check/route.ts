// TEMPORARY AI diagnostic. Runs one real classification against a fixed
// sample and reports the honest outcome: configured or not, the model
// used, the classification, usage tokens, and the exact error when
// anything fails. Deleted after Phase 4 verification.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isAIConfigured, getModelName, classifyOpportunity, parseJSONResponse } from "@/lib/ai";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "NOT_OWNER" }, { status: 403 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      note: "GOOGLE_AI_API_KEY is missing. Add it to .env.local and restart the dev server.",
    });
  }

  const sample = {
    title: "Looking for a web designer for a small business site",
    body:
      "Hi everyone. We just opened a small bakery in Lagos and we need someone to build " +
      "a simple website for us, maybe with online ordering. We would also love a logo. " +
      "Budget is available, please share examples of your work.",
    serviceOptions: [
      { id: "web-design", label: "Web Design" },
      { id: "logo-design", label: "Logo Design" },
      { id: "copywriting", label: "Copywriting" },
    ],
  };

  const result = await classifyOpportunity(sample);
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      configured: true,
      model: getModelName(),
      error: result.error,
      hint:
        result.error.includes("API key")
          ? "The API key was rejected. Re-create the key in AI Studio and update .env.local, then restart."
          : result.error.includes("not found") || result.error.includes("404")
            ? "The model name was not found. Set GEMINI_MODEL in .env.local to a current model name from AI Studio, then restart."
            : "See the Google error above.",
    });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    model: getModelName(),
    sampleUsed: sample,
    classification: result.result,
    parseCheck: parseJSONResponse(JSON.stringify(result.result)) !== null,
  });
}