// The sources catalog: schema, categories, and the seed list.
// Every opportunity TradeCraft shows originates from a source here.
// Sources are data, not code: added, edited, and retired by the owner
// (admin UI arrives in Phase 7). The client never reads this collection;
// server code uses the Admin SDK.
//
// Verification history (owner-verified before seeding):
//  - We Work Remotely feeds use the .rss suffix (dot, not slash).
//  - Remote OK was dropped: feed returned 410 Gone, permanently dead.
//  - Remotive's current feed path is /remote-jobs/feed.
//  - hnrss.org/jobs verified live.
// Seeding is idempotent: seedSourcesIfEmpty only writes when the catalog
// is empty, so re-running never duplicates.

export type SourceType = "rss";
export type SourceTier = "free" | "premium";
export type SourceCategory =
  | "development"
  | "design"
  | "writing"
  | "marketing"
  | "community"
  | "mixed";

export type SeedSource = {
  sourceId: string;
  name: string;
  type: SourceType;
  url: string;
  siteUrl: string;
  category: SourceCategory;
  tier: SourceTier;
  cadenceHours: number;
};

export const SEED_SOURCES: SeedSource[] = [
  {
    sourceId: "wwr-programming",
    name: "We Work Remotely, Programming",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    siteUrl: "https://weworkremotely.com",
    category: "development",
    tier: "free",
    cadenceHours: 3,
  },
  {
    sourceId: "wwr-design",
    name: "We Work Remotely, Design",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-design-jobs.rss",
    siteUrl: "https://weworkremotely.com",
    category: "design",
    tier: "free",
    cadenceHours: 3,
  },
  {
    sourceId: "remotive",
    name: "Remotive",
    type: "rss",
    url: "https://remotive.com/remote-jobs/feed",
    siteUrl: "https://remotive.com",
    category: "mixed",
    tier: "free",
    cadenceHours: 3,
  },
  {
    sourceId: "hnrss-jobs",
    name: "Hacker News jobs",
    type: "rss",
    url: "https://hnrss.org/jobs",
    siteUrl: "https://news.ycombinator.com",
    category: "mixed",
    tier: "free",
    cadenceHours: 2,
  },
];