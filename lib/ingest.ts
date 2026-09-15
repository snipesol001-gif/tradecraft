// The ingestion worker. Fetches due RSS sources, parses items, dedupes
// by deterministic document ID, scores with rules, optionally classifies
// with AI (budget-gated per UTC day via config/ai), stores, and updates
// per-source health.
//
// v1.2 fixes, found by owner testing:
//  - The AI budget is ONE shared pool across all sources. The previous
//    version gave each parallel source its own counter, so a budget of 1
//    could spend up to one per source.
//  - Dedupe now happens BEFORE the AI call. The previous version
//    classified items and only then discovered they were duplicates,
//    burning AI quota on items it discarded.

import { createHash } from "crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { XMLParser } from "fast-xml-parser";
import { getAdminApp } from "./firebase-admin";
import { scoreOpportunity } from "./scoring";
import { classifyIngestedItem, getAIScoringConfig, getModelName } from "./ai";
import { SERVICES } from "./services";
import type { SourceCategory } from "./sources";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FEED_CHARS = 2_000_000;
const MAX_SUMMARY_CHARS = 320;
const USER_AGENT =
  "TradeCraftBot/1.0 (opportunity ingestion; +https://tradecraft9.vercel.app)";

export type SourceReport = {
  sourceId: string;
  status: "ok" | "error" | "skipped";
  fetched: number;
  stored: number;
  duplicates: number;
  error?: string;
};

export type IngestReport = {
  startedAt: string;
  force: boolean;
  sources: SourceReport[];
  totalStored: number;
  aiClassified: number;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.__cdata === "string") return o.__cdata.trim();
    if (typeof o["#text"] === "string") return o["#text"].trim();
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHtml(html: string): string {
  const noTags = html.replace(/<[^>]*>/g, " ");
  const decoded = noTags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  return decoded.replace(/\s+/g, " ").trim().slice(0, MAX_SUMMARY_CHARS);
}

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "::1") return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await res.text();
    if (body.length > MAX_FEED_CHARS) {
      throw new Error(`Feed too large (${body.length} chars)`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

type NormalizedItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: Date | null;
};

function parseFeed(xml: string): NormalizedItem[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const items: Array<Record<string, unknown>> = [];

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (channel?.item) {
    items.push(
      ...asArray(channel.item as Record<string, unknown> | Record<string, unknown>[])
    );
  }

  const atom = parsed.feed as Record<string, unknown> | undefined;
  if (!channel && atom?.entry) {
    items.push(
      ...asArray(atom.entry as Record<string, unknown> | Record<string, unknown>[])
    );
  }

  const out: NormalizedItem[] = [];
  for (const item of items) {
    const rawLink =
      text(item.link) ||
      (typeof item.link === "object" && item.link !== null
        ? text((item.link as Record<string, unknown>).href)
        : "") ||
      text(item.url);
    const title = text(item.title);
    if (!rawLink || !title) continue;
    const summary = stripHtml(
      text(item.description) || text(item.summary) || text(item.content)
    );
    const dateRaw = text(item.pubDate) || text(item.published) || text(item.updated);
    const parsedDate = dateRaw ? new Date(dateRaw) : null;
    out.push({
      title,
      link: rawLink,
      summary,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    });
  }
  return out;
}

// ONE shared AI budget for the whole run. remaining decrements
// synchronously before each AI call, so parallel sources cannot
// collectively overshoot it.
type AIBudget = {
  remaining: number;
};

async function ingestSource(
  source: {
    sourceId: string;
    name: string;
    url: string;
    siteUrl: string;
    category: SourceCategory;
    tier: string;
  },
  db: ReturnType<typeof getFirestore>,
  ai: AIBudget
): Promise<SourceReport & { aiUsed: number }> {
  const report = {
    sourceId: source.sourceId,
    status: "ok" as const,
    fetched: 0,
    stored: 0,
    duplicates: 0,
    aiUsed: 0,
  };

  try {
    const xml = await fetchFeed(source.url);
    const items = parseFeed(xml);
    report.fetched = items.length;

    for (const item of items) {
      const hash = createHash("sha256").update(item.link).digest("hex");
      const docId = `${source.sourceId}_${hash.slice(0, 40)}`;
      const docRef = db.collection("opportunities").doc(docId);

      // Dedupe BEFORE the AI call: an existing item must never consume
      // AI quota.
      const existing = await docRef.get();
      if (existing.exists) {
        report.duplicates += 1;
        continue;
      }

      const score = scoreOpportunity({
        title: item.title,
        summary: item.summary,
        sourceCategory: source.category,
      });

      // Optional AI classification from the shared budget. Check and
      // decrement synchronously, then await the call: no race can spend
      // the same unit twice.
      let aiFields: Record<string, unknown> = { aiScored: false };
      if (ai.remaining > 0) {
        ai.remaining -= 1;
        report.aiUsed += 1;

        const labels = score.matchedServiceIds.length
          ? score.matchedServiceIds
              .map((id) => SERVICES.find((s) => s.id === id))
              .filter((s): s is (typeof SERVICES)[number] => Boolean(s))
              .map((s) => ({ id: s.id, label: s.label }))
          : SERVICES.slice(0, 10).map((s) => ({ id: s.id, label: s.label }));

        const aiResult = await classifyIngestedItem({
          title: item.title,
          summary: item.summary,
          serviceOptions: labels,
        });
        if (aiResult.ok) {
          aiFields = {
            aiScored: true,
            aiScore: aiResult.result.score,
            aiConfidence: aiResult.result.confidence,
            aiReasons: aiResult.result.reasons,
            aiEvidence: aiResult.result.evidenceQuote,
            aiGrounded: aiResult.result.grounded,
            aiIsGenuine: aiResult.result.isGenuineOpportunity,
            aiMatchedServiceIds: aiResult.result.matchedServiceIds,
            aiScoredAt: new Date().toISOString(),
            aiModel: getModelName(),
          };
        } else if (aiResult.transient) {
          aiFields = { aiScored: false, aiPending: true };
        } else {
          aiFields = { aiScored: false };
        }
      }

      try {
        await docRef.create({
          sourceId: source.sourceId,
          sourceName: source.name,
          sourceCategory: source.category,
          tier: source.tier,
          siteUrl: source.siteUrl,
          title: item.title,
          summary: item.summary,
          url: item.link,
          publishedAt: item.publishedAt ?? null,
          fetchedAt: FieldValue.serverTimestamp(),
          score: score.score,
          matchedServiceIds: score.matchedServiceIds,
          reasons: score.reasons,
          status: "active",
          ...aiFields,
        });
        report.stored += 1;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "6" || code === "already-exists") {
          report.duplicates += 1;
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    report.status = "error";
    report.error = err instanceof Error ? err.message : String(err);
  }

  return report;
}

async function updateSourceHealth(
  sourceId: string,
  report: SourceReport,
  db: ReturnType<typeof getFirestore>
) {
  const ref = db.collection("sources").doc(sourceId);
  await ref.set(
    {
      health: {
        lastFetchedAt: FieldValue.serverTimestamp(),
        lastStatus: report.status === "ok" ? "ok" : `error: ${report.error ?? "unknown"}`,
        consecutiveFailures: report.status === "ok" ? 0 : FieldValue.increment(1),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function runIngestion(options: { force?: boolean } = {}): Promise<IngestReport> {
  const db = getFirestore(getAdminApp());
  const startedAt = new Date().toISOString();
  const snap = await db.collection("sources").where("active", "==", true).get();

  const report: IngestReport = {
    startedAt,
    force: options.force === true,
    sources: [],
    totalStored: 0,
    aiClassified: 0,
  };
  const now = Date.now();

  // One shared AI budget for the entire run.
  const aiCfg = await getAIScoringConfig().catch(() => ({
    scoringEnabled: false,
    dailyItemBudget: 0,
    usedToday: 0,
  }));
  const ai: AIBudget = {
    remaining: aiCfg.scoringEnabled
      ? Math.max(0, aiCfg.dailyItemBudget - aiCfg.usedToday)
      : 0,
  };

  const due: Array<{ source: Record<string, unknown>; id: string }> = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const last = d.health?.lastFetchedAt;
    const lastMs = last && typeof last.toMillis === "function" ? last.toMillis() : 0;
    const cadenceMs = (typeof d.cadenceHours === "number" ? d.cadenceHours : 3) * 3600_000;
    if (options.force || !lastMs || now - lastMs >= cadenceMs) {
      due.push({ source: { ...d, sourceId: doc.id } as Record<string, unknown>, id: doc.id });
    } else {
      report.sources.push({
        sourceId: doc.id,
        status: "skipped",
        fetched: 0,
        stored: 0,
        duplicates: 0,
      });
    }
  }

  const results = await Promise.all(
    due.map(async ({ source, id }) => {
      const r = await ingestSource(
        {
          sourceId: id,
          name: String(source.name ?? id),
          url: String(source.url ?? ""),
          siteUrl: String(source.siteUrl ?? ""),
          category: (source.category ?? "mixed") as SourceCategory,
          tier: String(source.tier ?? "free"),
        },
        db,
        ai
      );
      await updateSourceHealth(id, r, db);
      return r;
    })
  );

  report.sources.push(...results);
  report.totalStored = results.reduce((sum, r) => sum + r.stored, 0);
  report.aiClassified = results.reduce((sum, r) => sum + r.aiUsed, 0);

  await db.collection("system").doc("ingestState").set(
    { lastFullIngestAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return report;
}

// Lazy trigger for caller pages: ingest only if the last full run is
// older than minGapMs. Returns null when nothing was due.
export async function ingestIfDue(minGapMs = 3 * 3600_000): Promise<IngestReport | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("system").doc("ingestState").get();
  const last = snap.data()?.lastFullIngestAt;
  const lastMs = last && typeof last.toMillis === "function" ? last.toMillis() : 0;
  if (lastMs && Date.now() - lastMs < minGapMs) {
    return null;
  }
  return runIngestion({ force: false });
}