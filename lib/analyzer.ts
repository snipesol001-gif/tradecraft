// The Website Analyzer engine. Fetches a public page safely, extracts
// real structure and content, then asks the AI layer for a professional
// audit. Every dimension score comes with reasons drawn from the actual
// extraction. Nothing about the page is invented: when evidence is
// missing, the dimension scores lower and says what was missing.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import { safeFetch, isPublicHttpUrl } from "./fetcher";
import { generateJSON, parseJSONResponse, isAIConfigured, getModelName } from "./ai";

export type AnalyzerDimensions = {
  clarity: { score: number; reason: string };
  offer: { score: number; reason: string };
  trust: { score: number; reason: string };
  callToAction: { score: number; reason: string };
  contentDepth: { score: number; reason: string };
};

export type AnalyzerResult = {
  overallScore: number;
  summary: string;
  dimensions: AnalyzerDimensions;
  strengths: string[];
  weaknesses: string[];
  brief: string;
  buildPrompt: string;
};

export type AnalyzerExtraction = {
  title: string;
  metaDescription: string;
  headings: string[];
  textLength: number;
  wordCount: number;
  linkCount: number;
  hasContactHints: boolean;
  hasPricingHints: boolean;
  hasTestimonialHints: boolean;
  hasPortfolioHints: boolean;
};

export function extractFromHtml(html: string): AnalyzerExtraction {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const metaDescription =
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1]?.trim() ?? "";

  const headings: string[] = [];
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null && headings.length < 25) {
    const t = m[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (t) headings.push(t.slice(0, 120));
  }

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = bodyText.toLowerCase();
  const linkCount = (html.match(/<a\s/gi) ?? []).length;

  return {
    title,
    metaDescription,
    headings,
    textLength: bodyText.length,
    wordCount: bodyText ? bodyText.split(" ").length : 0,
    linkCount,
    hasContactHints: /contact|email|whatsapp|phone|get in touch/.test(lower),
    hasPricingHints: /pricing|price|cost|budget|₦|\$/.test(lower),
    hasTestimonialHints: /testimonial|what clients say|reviews|our clients/.test(lower),
    hasPortfolioHints: /portfolio|our work|projects|case stud/.test(lower),
  };
}

// The AI audit task. Input is the real extraction; the model must cite
// what it saw. Ungrounded analysis is the failure mode we refuse.
async function aiAnalyze(params: {
  url: string;
  extraction: AnalyzerExtraction;
}): Promise<AnalyzerResult> {
  const e = params.extraction;
  const evidenceBlock = `URL: ${params.url}
PAGE TITLE: ${e.title || "(none)"}
META DESCRIPTION: ${e.metaDescription || "(none)"}
HEADINGS (${e.headings.length}): ${e.headings.join(" | ") || "(none)"}
VISIBLE TEXT LENGTH: ${e.textLength} chars, ${e.wordCount} words
LINK COUNT: ${e.linkCount}
HAS CONTACT SIGNALS: ${e.hasContactHints}
HAS PRICING SIGNALS: ${e.hasPricingHints}
HAS TESTIMONIAL SIGNALS: ${e.hasTestimonialHints}
HAS PORTFOLIO SIGNALS: ${e.hasPortfolioHints}`;

  const prompt = `You are a senior web consultant auditing a business website for a freelance professional who may pitch improvements to its owner.

 ${evidenceBlock}

Score each dimension 0-100 based ONLY on the evidence above. When evidence is missing, score lower and say exactly what was missing (for example: "no meta description found").

Respond with JSON only, exactly:
{
  "overallScore": 0 to 100,
  "summary": "3 sentence professional summary for the auditor",
  "dimensions": {
    "clarity": { "score": 0, "reason": "..." },
    "offer": { "score": 0, "reason": "..." },
    "trust": { "score": 0, "reason": "..." },
    "callToAction": { "score": 0, "reason": "..." },
    "contentDepth": { "score": 0, "reason": "..." }
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "brief": "A client-ready improvement brief: 120 to 180 words, addressed to the site owner, professional and specific, referencing the evidence.",
  "buildPrompt": "A detailed prompt the auditor can paste into an AI builder to create an improved ORIGINAL site for this type of business. Must not copy the site's text or branding."
}`;

  const result = await generateJSON(prompt, 2048);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const parsed = parseJSONResponse(result.text);
  if (!parsed) {
    throw new Error("The analysis response could not be parsed. Please try again.");
  }

  const dim = (name: string): { score: number; reason: string } => {
    const d = (parsed.dimensions as Record<string, Record<string, unknown>> | undefined)?.[name];
    const score = typeof d?.score === "number" ? Math.max(0, Math.min(100, Math.round(d.score))) : 0;
    const reason = typeof d?.reason === "string" ? d.reason.slice(0, 400) : "No reason provided.";
    return { score, reason };
  };

  const strArr = (v: unknown): string[] =>
    Array.isArray(v)
      ? (v as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 5)
      : [];

  return {
    overallScore:
      typeof parsed.overallScore === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
        : 0,
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 800) : "",
    dimensions: {
      clarity: dim("clarity"),
      offer: dim("offer"),
      trust: dim("trust"),
      callToAction: dim("callToAction"),
      contentDepth: dim("contentDepth"),
    },
    strengths: strArr(parsed.strengths),
    weaknesses: strArr(parsed.weaknesses),
    brief: typeof parsed.brief === "string" ? parsed.brief.slice(0, 2500) : "",
    buildPrompt: typeof parsed.buildPrompt === "string" ? parsed.buildPrompt.slice(0, 3000) : "",
  };
}

export type AnalyzerRun = {
  runId: string;
  url: string;
  finalUrl: string;
  result: AnalyzerResult;
  extraction: AnalyzerExtraction;
};

// Runs the analyzer. Premium must be verified by the caller before this.
export async function runAnalyzer(params: {
  uid: string;
  url: string;
}): Promise<{ ok: true; run: AnalyzerRun } | { ok: false; error: string; status?: number }> {
  if (!isAIConfigured()) {
    return { ok: false, error: "AI features are not configured yet.", status: 503 };
  }

  const url = params.url.trim();
  if (!url.startsWith("https://")) {
    return { ok: false, error: "Enter the full URL starting with https://" };
  }
  if (!isPublicHttpUrl(url)) {
    return { ok: false, error: "Only public https:// websites can be analyzed." };
  }
  if (url.length > 2000) {
    return { ok: false, error: "That URL is too long." };
  }

  const db = getFirestore(getAdminApp());
  const runRef = db.collection("analyzerRuns").doc();

  const fetched = await safeFetch(url);
  if (!fetched.ok) {
    return { ok: false, error: fetched.error };
  }

  const extraction = extractFromHtml(fetched.html);

  let result: AnalyzerResult;
  try {
    result = await aiAnalyze({ url: fetched.finalUrl, extraction });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await runRef.set({
      uid: params.uid,
      url,
      status: "failed",
      error: message.slice(0, 500),
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: false, error: "The AI analysis could not complete. Please try again." };
  }

  await runRef.set({
    uid: params.uid,
    url,
    finalUrl: fetched.finalUrl,
    status: "completed",
    extraction,
    result,
    aiModel: getModelName(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    run: { runId: runRef.id, url, finalUrl: fetched.finalUrl, result, extraction },
  };
}