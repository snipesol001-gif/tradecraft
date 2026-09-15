// TEMPORARY diagnostic. Lists the models your Google AI key can actually
// use, filtered to those supporting text generation. This is how we pick
// GEMINI_MODEL from truth instead of guessing. Deleted with ai-check
// after Phase 4 verification.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isAIConfigured } from "@/lib/ai";

export async function GET() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "NOT_SIGNED_IN" }, { status: 401 });
  }
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "NOT_OWNER" }, { status: 403 });
  }

  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "KEY_NOT_CONFIGURED" });
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      { headers: { "x-goog-api-key": key } }
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: body?.error?.message ?? `HTTP ${res.status}`,
      });
    }

    const models = Array.isArray(body?.models) ? body.models : [];
    const usable = models
      .filter(
        (m: { supportedGenerationMethods?: string[] }) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent")
      )
      .map((m: { name?: string }) => (m.name ?? "").replace("models/", ""));

    return NextResponse.json({ ok: true, count: usable.length, models: usable });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}