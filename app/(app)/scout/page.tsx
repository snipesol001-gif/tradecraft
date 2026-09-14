"use client";

// The Scout feed. Ranked opportunities, filtered to the user's services.
// Services load independently of the feed: a feed failure never fakes an
// empty services count. A missing index shows its one-click creation
// button. Saving a lead spends server-defined credits, exactly once.

import { useEffect, useState } from "react";
import { ExternalLink, Bookmark, Radar } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/cn";

type FeedItem = {
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
};

function timeAgo(ms: number | null): string {
  if (!ms) return "";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function serviceLabel(id: string): string {
  return SERVICES.find((s) => s.id === id)?.label ?? id;
}

export default function ScoutPage() {
  const { refresh: refreshCredits } = useCredits();
  const { toast } = useToast();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  const [leadSaveCost, setLeadSaveCost] = useState(1);
  const [myServiceIds, setMyServiceIds] = useState<string[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Services load on their own, so feed failures can never fake "(0)".
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/onboarding/state");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && Array.isArray(data.data?.services)) {
          setMyServiceIds(data.data.services);
        }
      } finally {
        setServicesLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scout/feed");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setItems(data.items);
          setLeadSaveCost(typeof data.leadSaveCost === "number" ? data.leadSaveCost : 1);
          setError(null);
          setIndexUrl(null);
        } else {
          if (data?.error === "MISSING_INDEX" && typeof data.indexUrl === "string") {
            setIndexUrl(data.indexUrl);
            setError("A one-time database index is needed for the feed.");
          } else if (data?.error === "ONBOARDING_INCOMPLETE") {
            setError("Finish onboarding to use Scout.");
          } else {
            setError("Could not load the feed. Please refresh and try again.");
          }
          console.error("[scout] feed error:", res.status, data);
        }
      } catch {
        setError("Could not load the feed. Please refresh and try again.");
      }
    })();
  }, []);

  const servicesReady = servicesLoaded && myServiceIds.length > 0;
  const visible = items
    ? filter === "mine" && servicesReady
      ? items.filter((i) => i.matchedServiceIds.some((id) => myServiceIds.includes(id)))
      : items
    : [];

  async function saveLead(item: FeedItem) {
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
        if (data.duplicate) {
          toast({ title: "Already saved", description: "This one is in your leads." });
          return;
        }
        toast({
          title: "Lead saved",
          description: `"${item.title.slice(0, 60)}" added to your pipeline. ${leadSaveCost} credit spent.`,
          variant: "success",
        });
        refreshCredits();
      } else if (data?.error === "INSUFFICIENT_CREDITS") {
        toast({
          title: "Not enough credits",
          description: `Saving a lead costs ${leadSaveCost}. Your daily refill is coming.`,
          variant: "error",
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
          <p className="eyebrow">Discover</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Scout</h1>
          <p className="mt-1 text-sm text-text-muted">
            Real opportunities from live sources, ranked for your skills.
            Saving a lead costs {leadSaveCost} credit.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("mine")}
          disabled={!servicesReady}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
            filter === "mine"
              ? "border-text-primary bg-text-primary text-background"
              : "border-border bg-surface text-text-muted hover:border-border-strong"
          )}
        >
          My services ({myServiceIds.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            filter === "all"
              ? "border-text-primary bg-text-primary text-background"
              : "border-border bg-surface text-text-muted hover:border-border-strong"
          )}
        >
          All opportunities
        </button>
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
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-muted">
            <Radar size={20} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-text-primary">
            {filter === "mine"
              ? "Nothing matching your services yet"
              : "The feed is empty"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {filter === "mine"
              ? "New items arrive as sources update, usually within hours. Check 'All opportunities' to browse everything."
              : "Sources refresh on their own schedule. Check back soon."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const saved = savedIds.has(item.id);
            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                          item.score >= 50
                            ? "bg-text-primary text-background"
                            : item.score > 0
                              ? "border border-border bg-sunken text-text-muted"
                              : "border border-border bg-surface text-text-faint"
                        )}
                      >
                        {item.score > 0 ? `${item.score}` : "unranked"}
                      </span>
                      <span className="text-xs text-text-faint">
                        {item.sourceName}
                        {item.publishedAtMs ? ` · ${timeAgo(item.publishedAtMs)}` : ""}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-semibold leading-snug text-text-primary">
                      {item.title}
                    </h2>
                    {item.summary && (
                      <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.summary}</p>
                    )}
                    {item.reasons.length > 0 && (
                      <p className="mt-2 text-xs text-text-muted">
                        <span className="font-medium text-text-primary">Why it matched: </span>
                        {item.reasons.join("; ")}
                      </p>
                    )}
                    {item.matchedServiceIds.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {item.matchedServiceIds.slice(0, 4).map((id) => (
                          <span
                            key={id}
                            className="rounded-full border border-border bg-sunken px-2 py-0.5 text-[10px] font-medium text-text-muted"
                          >
                            {serviceLabel(id)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <ExternalLink size={15} />
                      Open original
                    </Button>
                  </a>
                  <Button
                    className="flex-1"
                    onClick={() => saveLead(item)}
                    disabled={saved}
                    loading={savingId === item.id}
                  >
                    <Bookmark size={15} />
                    {saved ? "Saved" : `Save lead (${leadSaveCost} credit)`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}