// The Job Feeds provider: free by owner decision. Backed by the
// ingestion pipeline, which continuously fills the shared opportunities
// pool from the owner-verified sources in the sources catalog.
//
// Freshness: beforeRun calls the existing ingestIfDue() mechanism, which
// is a fast no-op when ingestion ran inside its gap window. No second
// ingestion system is introduced.
//
// A run selects from the pool: items matching the user's profile
// services rank first, then by score and freshness. Two exclusions keep
// discovery honest:
//   - opportunities already saved as leads,
//   - opportunities returned by the user's recent runs.
// Fewer genuine matches than requested means a smaller result. Nothing
// is padded, and nothing is charged: this provider is free.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "../firebase-admin";
import { ingestIfDue } from "../ingest";
import type { ScoutProvider, ScoutDiscovery } from "./types";

// How many of the user's recent runs are checked for repeat exclusions.
const RECENT_RUNS_CHECKED = 20;

export const feedsProvider: ScoutProvider = {
  id: "feeds",
  label: "Job feeds",
  description:
    "Remote job listings continuously ingested from TradeCraft's verified public sources.",
  status: "active",
  statusNote: "",
  pricing: "free",
  async beforeRun() {
    // No-op when ingestion ran recently; a cold run adds latency once
    // per gap window.
    await ingestIfDue().catch((err) => {
      console.error("[feeds] freshness refresh failed (non-fatal):", err);
    });
  },
  async run(params) {
    const db = getFirestore(getAdminApp());

    const leadsSnap = await db
      .collection("userLeads")
      .where("uid", "==", params.uid)
      .get();
    const excluded = new Set<string>();
    for (const d of leadsSnap.docs) {
      const v = d.data();
      if (typeof v.opportunityId === "string") excluded.add(v.opportunityId);
    }

    const runsSnap = await db
      .collection("scoutRuns")
      .where("uid", "==", params.uid)
      .limit(RECENT_RUNS_CHECKED)
      .get();
    for (const d of runsSnap.docs) {
      const ids = d.data().discoveryIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === "string") excluded.add(id);
        }
      }
    }

    const snap = await db
      .collection("opportunities")
      .where("status", "==", "active")
      .orderBy("score", "desc")
      .orderBy("fetchedAt", "desc")
      .limit(200)
      .get();

    const mine = params.serviceIds.length > 0 ? new Set(params.serviceIds) : null;

    const ranked: Array<{ item: ScoutDiscovery; relevant: boolean }> = [];
    for (const doc of snap.docs) {
      if (excluded.has(doc.id)) continue;
      const d = doc.data();
      const matched = Array.isArray(d.matchedServiceIds)
        ? (d.matchedServiceIds as string[])
        : [];
      const relevant = mine ? matched.some((id) => mine.has(id)) : true;
      ranked.push({
        relevant,
        item: {
          opportunityId: doc.id,
          title: typeof d.title === "string" ? d.title : "Untitled",
          summary: typeof d.summary === "string" ? d.summary : "",
          url: typeof d.url === "string" ? d.url : "",
          sourceName: typeof d.sourceName === "string" ? d.sourceName : "",
          publishedAtMs:
            d.publishedAt && typeof d.publishedAt.toMillis === "function"
              ? d.publishedAt.toMillis()
              : null,
          score: typeof d.score === "number" ? d.score : 0,
          matchedServiceIds: matched,
          reasons: Array.isArray(d.reasons) ? (d.reasons as string[]) : [],
          authorHandle: null,
        },
      });
    }

    ranked.sort((a, b) => Number(b.relevant) - Number(a.relevant));

    const discoveries = ranked
      .filter((r) => (mine ? r.relevant : true))
      .slice(0, params.count)
      .map((r) => r.item);

    return { discoveries };
  },
};