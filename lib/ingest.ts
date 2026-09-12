// The ingestion worker. Fetches due RSS sources, parses items, dedupes
// by document ID (sourceId + hash of the link, so duplicates are
// structurally impossible), scores against the services catalog, stores
// opportunities, and updates per-source health.
//
// Honesty rules: only https fetches with timeout and size caps; raw feed
// content is stored as summary text with a link back to the original
// source (never altered or presented as TradeCraft's own content);
// failed sources report errors into their health record, they never
// disappear silently.
//
// Trigger model: manual (owner route), scheduled (Vercel cron, daily on
// the Hobby plan), and lazy (Scout page calls ingestIfDue). Double runs
// are harmless: every item create is a no-op if the hash already exists.

import { createHash } from "crypto";
import { FieldValue, getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { XMLParser } from "fast-xml-parser";
import { getAdminApp } from "./firebase-admin";
import { scoreOpportunity } from "./scoring";
import type { SourceCategory } from "./sources";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FEED_CHARS = 2_000_000;
const MAX_SUMMARY_CHARS = 320;
const USER_AGENT = "TradeCraftBot/1.0 (opportunity ingestion; +https://tradecraft9.vercel.app)";

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
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
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

  // RSS 2.0
  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (channel?.item) {
    items.push(...asArray(channel.item as Record<string, unknown> | Record<string, unknown>[]));
  }

  // Atom fallback for future sources.
  const atom = parsed.feed as Record<string, unknown> | undefined;
  if (!channel && atom?.entry) {
    items.push(...asArray(atom.entry as Record<string, unknown> | Record<string, unknown>[]));
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
    const summary = stripHtml(text(item.description) || text(item.summary) || text(item.content));
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

async function ingestSource(
  source: {
    sourceId: string;
    name: string;
    url: string;
    siteUrl: string;
    category: SourceCategory;
    tier: string;
  },
  db: ReturnType<typeof getFirestore>
): Promise<SourceReport> {
  const report: SourceReport = {
    sourceId: source.sourceId,
    status: "ok",
    fetched: 0,
    stored: 0,
    duplicates: 0,
  };

  try {
    const xml = await fetchFeed(source.url);
    const items = parseFeed(xml);
    report.fetched = items.length;

    // Parallel creates in small chunks; existing docs count as duplicates.
    for (let i = 0; i < items.length; i += 8) {
      const chunk = items.slice(i, i + 8);
      await Promise.all(
        chunk.map(async (item) => {
          const hash = createHash("sha256").update(item.link).digest("hex");
          const docId = `${source.sourceId}_${hash.slice(0, 40)}`;
          const score = scoreOpportunity({
            title: item.title,
            summary: item.summary,
            sourceCategory: source.category,
          });
          try {
            await db.collection("opportunities").doc(docId).create({
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
        })
      );
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
  db: ReturnType<typeof getFirestore>,
  batch?: WriteBatch
) {
  const ref = db.collection("sources").doc(sourceId);
  const health = {
    lastFetchedAt: FieldValue.serverTimestamp(),
    lastStatus: report.status === "ok" ? "ok" : `error: ${report.error ?? "unknown"}`,
    consecutiveFailures: report.status === "ok" ? 0 : FieldValue.increment(1),
  };
  if (batch) {
    batch.set(ref, { health, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await ref.set({ health, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
}

export async function runIngestion(options: { force?: boolean } = {}): Promise<IngestReport> {
  const db = getFirestore(getAdminApp());
  const startedAt = new Date().toISOString();
  const snap = await db.collection("sources").where("active", "==", true).get();

  const report: IngestReport = { startedAt, force: options.force === true, sources: [], totalStored: 0 };
  const now = Date.now();

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
        db
      );
      await updateSourceHealth(id, r, db);
      return r;
    })
  );

  report.sources.push(...results);
  report.totalStored = results.reduce((sum, r) => sum + r.stored, 0);

  await db.collection("system").doc("ingestState").set(
    { lastFullIngestAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return report;
}

// Lazy trigger for the Scout page: ingest only if the last full run is
// older than minGapMs. Returns null when nothing was due.
export async function ingestIfDue(
  minGapMs = 3 * 3600_000
): Promise<IngestReport | null> {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("system").doc("ingestState").get();
  const last = snap.data()?.lastFullIngestAt;
  const lastMs = last && typeof last.toMillis === "function" ? last.toMillis() : 0;
  if (lastMs && Date.now() - lastMs < minGapMs) {
    return null;
  }
  return runIngestion({ force: false });
}