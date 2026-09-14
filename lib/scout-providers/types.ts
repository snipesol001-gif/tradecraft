// The ScoutProvider contract. Every discovery source, current and future
// (job feeds, Reddit, X, and others), implements this. Providers declare
// their status honestly and declare their pricing:
//   free: runs never charge credits. Job Feeds is free by owner decision:
//     the underlying ingestion is shared infrastructure, and browsing or
//     saving feed opportunities stays free end to end.
//   per_discovery: each genuinely discovered opportunity costs
//     config.scoutDiscoveryCost credits, charged only for what was found.
// A provider that cannot genuinely discover says so. Nothing is ever
// fabricated.

export type ScoutProviderStatus = "active" | "pending_approval" | "unavailable";
export type ScoutPricing = "free" | "per_discovery";

export type ScoutDiscovery = {
  // For pool-backed providers this is the existing opportunity document
  // id, so Save Lead reuses the existing leads system and its dedupe.
  opportunityId: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  publishedAtMs: number | null;
  score: number;
  matchedServiceIds: string[];
  reasons: string[];
  // Platform providers fill this when the source exposes an author.
  authorHandle: string | null;
};

export type ScoutRunParams = {
  uid: string;
  count: number;
  // The user's profile services: the matching context for the run.
  serviceIds: string[];
};

export type ScoutRunResult = {
  discoveries: ScoutDiscovery[];
};

export type ScoutProvider = {
  id: string;
  label: string;
  description: string;
  status: ScoutProviderStatus;
  statusNote: string;
  pricing: ScoutPricing;
  // Refresh hook. Pool-backed providers use it to keep the pool fresh
  // before selecting (a fast no-op when ingestion ran recently). Remote
  // providers return without using it.
  beforeRun?: () => Promise<void>;
  run(params: ScoutRunParams): Promise<ScoutRunResult>;
};