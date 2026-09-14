"use client";

// Job Feeds: the free browsing experience over the ingested pool.
// Secondary discovery source, clearly distinct from Scout. Free to
// browse, free to save leads.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import OpportunityCard, {
  type OpportunityCardData,
} from "@/components/scout/opportunity-card";

type FeedResponse = {
  ok?: boolean;
  items?: Array<{
    id: string;
    title: string;
    summary: string;
    url: string;
    sourceName: string;
    publishedAtMs: number | null;
    fetchedAtMs: number | null;
    score: number;
    matchedServiceIds: string[];
    reasons: string[];
  }>;
  error?: string;
  indexUrl?: string;
};

export default function JobFeedsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OpportunityCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/job-feeds");
        const data: FeedResponse = await res.json().catch(() => null);
        if (res.ok && data?.ok && Array.isArray(data.items)) {
          setItems(data.items);
        } else if (data?.error === "MISSING_INDEX" && data.indexUrl) {
          setIndexUrl(data.indexUrl);
          setError("A one-time database index is needed for Job Feeds.");
        } else {
          setError("Could not load Job Feeds. Please refresh and try again.");
        }
      } catch {
        setError("Could not load Job Feeds. Please refresh and try again.");
      }
    })();
  }, []);

  async function saveLead(item: OpportunityCardData) {
    if (savingId) return;
    setSavingId(item.id);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: item.id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setSavedIds((prev) => new Set(prev).add(item.id));
        toast({
          title: data.duplicate ? "Already saved" : "Lead saved",
          description: data.duplicate
            ? "This one is already in your pipeline."
            : `"${item.title.slice(0, 60)}" is now in your leads. Free, always.`,
          variant: "success",
        });
      } else {
        toast({ title: "Could not save", description: "Please try again.", variant: "error" });
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Secondary source</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            Job Feeds
          </h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">
            Remote job listings from TradeCraft's verified public sources.
            Free to browse and save. Scout, with platform discovery, is the
            primary experience.
          </p>
        </div>
        <Link href="/scout" className="shrink-0">
          <Button variant="secondary" size="sm">
            Back to Scout
          </Button>
        </Link>
      </div>

      {items === null && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <Card className="p-5">
          <p className="text-sm text-danger">{error}</p>
          {indexUrl && (
            <a href={indexUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
              <Button size="sm">Create the index, then refresh this page</Button>
            </a>
          )}
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-muted">
            <Newspaper size={20} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-text-primary">
            The feeds are empty right now
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            Sources refresh on their own schedule. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <OpportunityCard
              key={item.id}
              item={item}
              saveLabel="Save lead (free)"
              saved={savedIds.has(item.id)}
              saving={savingId === item.id}
              onSave={saveLead}
            />
          ))}
        </div>
      )}
    </div>
  );
}