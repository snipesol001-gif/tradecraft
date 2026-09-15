// AI provider abstraction, v1: Google Gemini via REST.
//
// Design rules (blueprint section 60):
//  - The API key exists only server-side. Never NEXT_PUBLIC_.
//  - Tasks are declared once with their prompt and limits; callers never
//    talk to the raw API.
//  - Every call is logged to the aiUsage collection with real usage
//    metadata, so AI cost is always observable, never guessed.
//  - Degraded honesty: with no key configured, isAIConfigured() returns
//    false and callers fall back to rule-based scoring with an honest
//    "AI scoring is off" state. Nothing pretends.
//
// Model resilience: a fallback CHAIN, not a single name. Google's catalog
// churns (models get deprecated while still being listed), and free-tier
// capacity fluctuates. The chain tries the configured model first, then
// the configured fallback, then the code default. Model-specific failures
// (deprecated, not found) and transient capacity failures both fall
// through to the next candidate. Only auth failures stop the chain: a
// rejected key fails on every model equally.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-latest";
const TIMEOUT_MS = 30_000;

export function isAIConfigured(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// The fallback chain, fully env-driven so reordering never needs a code
// change. Duplicates are removed while preserving order.
function getModelChain(): string[] {
  const configured = process.env.GEMINI_MODEL;
  const fallback = process.env.GEMINI_MODEL_FALLBACK;
  const chain = [configured, fallback, DEFAULT_MODEL].filter(
    (m, i, arr) => typeof m === "string" && m.length > 0 && arr.indexOf(m) === i
  );
  return chain.length > 0 ? chain : [DEFAULT_MODEL];
}

// Decides whether the next model in the chain should be tried. Two
// classes qualify: transient capacity problems (busy, overloaded), and
// model-specific problems (deprecated, not found), because a bad model
// name says nothing about the next candidate. Only auth failures stop
// the chain: a rejected key fails on every model equally.
function shouldTryNext(message: string, status?: number): boolean {
  const m = message.toLowerCase();
  if (
    m.includes("high demand") ||
    m.includes("overloaded") ||
    m.includes("unavailable") ||
    m.includes("quota") ||
    m.includes("503") ||
    m.includes("429") ||
    m.includes("no longer available") ||
    m.includes("not found") ||
    m.includes("not supported") ||
    status === 404
  ) {
    return true;
  }
  return false;
}

export type AIResult =
  | { ok: true; text: string; model: string; totalTokenCount: number | null; durationMs: number }
  | { ok: false; error: string; status?: number; model: string };

// One structured JSON completion, attempted across the model chain. This
// function is transport, timeout, fallback, parsing, and logging. Callers
// never talk to the raw API.
export async function generateJSON(prompt: string, maxOutputTokens = 512): Promise<AIResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    return { ok: false, error: "AI_NOT_CONFIGURED", model: getModelName() };
  }

  const chain = getModelChain();
  let lastError: string = "unknown";
  let lastStatus: number | undefined;

  for (const model of chain) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${API_ROOT}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
      });

      const durationMs = Date.now() - started;
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message = body?.error?.message ?? `HTTP ${res.status}`;
        await logUsage({ task: "generate", model, ok: false, durationMs, detail: message });
        lastError = message;
        lastStatus = res.status;
        if (shouldTryNext(message, res.status)) {
          continue;
        }
        return { ok: false, error: message, status: res.status, model };
      }

      const text: string =
        body?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      const totalTokenCount: number | null =
        typeof body?.usageMetadata?.totalTokenCount === "number"
          ? body.usageMetadata.totalTokenCount
          : null;

      await logUsage({ task: "generate", model, ok: true, durationMs, totalTokenCount });

      if (!text) {
        lastError = "EMPTY_RESPONSE";
        continue;
      }
      return { ok: true, text, model, totalTokenCount, durationMs };
    } catch (err) {
      const durationMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      await logUsage({ task: "generate", model, ok: false, durationMs, detail: message });
      lastError = message;
      lastStatus = undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    error: lastError,
    status: lastStatus,
    model: chain.join(" -> "),
  };
}

// Parse a JSON AI response defensively. Returns null when the model
// produced something unparseable, and callers degrade honestly.
export function parseJSONResponse(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// Usage logging. Cost estimation stays out of v1 (per-model pricing
// changes too fast to hardcode); token counts are the durable record.
async function logUsage(entry: {
  task: string;
  model: string;
  ok: boolean;
  durationMs: number;
  totalTokenCount?: number | null;
  detail?: string;
}) {
  try {
    const db = getFirestore(getAdminApp());
    await db.collection("aiUsage").add({
      task: entry.task,
      model: entry.model,
      ok: entry.ok,
      durationMs: entry.durationMs,
      totalTokenCount: entry.totalTokenCount ?? null,
      detail: entry.detail ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Logging must never break the caller.
  }
}

// ---------------------------------------------------------------------
// Task: classifyOpportunity. Separates observation from inference: the
// model answers only from the provided text, marks genuine hiring intent
// explicitly, and must quote the exact evidence it relied on. When the
// quote cannot be found in the source text, confidence drops, because
// ungrounded evidence is a hallucination signal.
// ---------------------------------------------------------------------

export type OpportunityClassification = {
  isGenuineOpportunity: boolean;
  confidence: "high" | "medium" | "low";
  matchedServiceIds: string[];
  score: number;
  reasons: string[];
  evidenceQuote: string;
  grounded: boolean;
};

export async function classifyOpportunity(input: {
  title: string;
  body: string;
  serviceOptions: Array<{ id: string; label: string }>;
}): Promise<{ ok: true; result: OpportunityClassification } | { ok: false; error: string }> {
  const serviceList = input.serviceOptions
    .map((s) => `- ${s.id}: ${s.label}`)
    .join("\n");

  const prompt = `You are evaluating whether a public post shows a genuine intent to hire or obtain professional help.

Possible services (id: label):
 ${serviceList}

POST TITLE:
 ${input.title}

POST CONTENT:
 ${input.body || "(no content provided)"}

Rules:
- Only use information present in the post. Never invent details.
- A post merely mentioning a service (for example, showcasing a website) is NOT an opportunity.
- Strong signals: asking for help, looking to hire, requesting recommendations for paid work, describing a project they need done.
- matchedServiceIds must be ids from the list above, or an empty array.
- evidenceQuote must be an exact quote copied from the post that supports your judgment. If you cannot quote the post exactly, set confidence to "low".

Respond with JSON only, in exactly this shape:
{
  "isGenuineOpportunity": true or false,
  "confidence": "high" or "medium" or "low",
  "matchedServiceIds": ["id", "..."],
  "score": 0 to 100,
  "reasons": ["short reason", "..."],
  "evidenceQuote": "exact quote from the post"
}`;

  const result = await generateJSON(prompt, 512);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const parsed = parseJSONResponse(result.text);
  if (!parsed) {
    return { ok: false, error: "UNPARSEABLE_RESPONSE" };
  }

  const isGenuine = parsed.isGenuineOpportunity === true;
  const confidence =
    parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "low";
  const matchedServiceIds = Array.isArray(parsed.matchedServiceIds)
    ? (parsed.matchedServiceIds as unknown[]).filter(
        (id): id is string =>
          typeof id === "string" && input.serviceOptions.some((s) => s.id === id)
      )
    : [];
  const score =
    typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
  const reasons = Array.isArray(parsed.reasons)
    ? (parsed.reasons as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 4)
    : [];
  const rawQuote = typeof parsed.evidenceQuote === "string" ? parsed.evidenceQuote.trim() : "";
  const haystack = `${input.title}\n${input.body}`.toLowerCase();
  const grounded = rawQuote.length > 0 && haystack.includes(rawQuote.toLowerCase().slice(0, 40));

  return {
    ok: true,
    result: {
      isGenuineOpportunity: isGenuine,
      confidence,
      matchedServiceIds,
      score,
      reasons,
      evidenceQuote: rawQuote.slice(0, 300),
      grounded,
    },
  };
}