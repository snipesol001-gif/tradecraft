"use client";

// Shared opportunity card for Scout results and Job Feeds browsing.
// Shows score honestly (unranked items say so), evidence lines, matched
// services, original link, and free Save Lead. Callers control the save
// behavior and label.

import { ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/cn";

export type OpportunityCardData = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  publishedAtMs: number | null;
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

type OpportunityCardProps = {
  item: OpportunityCardData;
  saveLabel: string;
  saved: boolean;
  saving: boolean;
  onSave: (item: OpportunityCardData) => void;
};

export default function OpportunityCard({
  item,
  saveLabel,
  saved,
  saving,
  onSave,
}: OpportunityCardProps) {
  return (
    <Card className="p-5">
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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="secondary" className="w-full">
            <ExternalLink size={15} />
            Open original
          </Button>
        </a>
        <Button
          className="flex-1"
          onClick={() => onSave(item)}
          disabled={saved}
          loading={saving}
        >
          <Bookmark size={15} />
          {saved ? "Saved" : saveLabel}
        </Button>
      </div>
    </Card>
  );
}