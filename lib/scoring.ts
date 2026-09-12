// Rule-based opportunity scoring, v1. Matches feed items against the
// services catalog (title matches weigh more than summary matches) and
// produces a 0-100 score with human-readable reasons. Honest by design:
// no match means score 0 with no invented reasons. Phase 4's AI scoring
// will upgrade this without changing the stored shape.

import { SERVICES } from "./services";
import type { SourceCategory } from "./sources";

export type OpportunityScore = {
  score: number;
  matchedServiceIds: string[];
  reasons: string[];
};

type ServiceMatcher = {
  id: string;
  label: string;
  phrase: string;
  words: string[];
};

const STOP_WORDS = new Set(["the", "and", "for", "with", "of", "to", "in", "on", "a", "an"]);

// Precomputed matchers: one per catalog service. The "(Web3)" marker is
// stripped from the phrase but kept as its own keyword, per the naming spec.
const MATCHERS: ServiceMatcher[] = SERVICES.map((s) => {
  const clean = s.label.replace(/\s*\((web3)\)\s*/i, " ").toLowerCase().trim();
  const phrase = clean.replace(/\s+/g, " ");
  const words = phrase
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  const isWeb3 = /\(web3\)/i.test(s.label);
  if (isWeb3) words.push("web3");
  return { id: s.id, label: s.label, phrase, words: [...new Set(words)] };
});

const CATEGORY_GROUP_BOOST: Partial<Record<SourceCategory, string>> = {
  development: "Development",
  design: "Design",
};

export function scoreOpportunity(params: {
  title: string;
  summary: string;
  sourceCategory: SourceCategory;
}): OpportunityScore {
  const title = params.title.toLowerCase();
  const summary = params.summary.toLowerCase();
  const boostGroup = CATEGORY_GROUP_BOOST[params.sourceCategory];

  const results = MATCHERS.map((m) => {
    let points = 0;
    const reasons: string[] = [];
    if (m.phrase && title.includes(m.phrase)) {
      points += 40;
      reasons.push(`"${m.phrase}" in the title`);
    } else if (m.phrase && summary.includes(m.phrase)) {
      points += 20;
      reasons.push(`"${m.phrase}" in the description`);
    }
    for (const w of m.words) {
      if (title.includes(w)) {
        points += 10;
      } else if (summary.includes(w)) {
        points += 4;
      }
    }
    const service = SERVICES.find((s) => s.id === m.id);
    if (points > 0 && service && service.group === boostGroup) {
      points += 5;
    }
    return { matcher: m, points, reasons };
  });

  const matched = results.filter((r) => r.points > 0);
  if (matched.length === 0) {
    return { score: 0, matchedServiceIds: [], reasons: [] };
  }

  matched.sort((a, b) => b.points - a.points);
  const score = Math.min(100, matched.reduce((sum, r) => sum + r.points, 0));
  const topReasons = matched
    .slice(0, 3)
    .flatMap((r) => r.reasons)
    .slice(0, 3);

  return {
    score,
    matchedServiceIds: matched.map((r) => r.matcher.id),
    reasons: topReasons,
  };
}