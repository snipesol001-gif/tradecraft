"use client";

// Shared opportunity card for Scout results and Job Feeds browsing.
// Includes the suggested-reply generator: drafts from the user's own
// profile, shown in a modal with a Copy button. TradeCraft never sends
// anything automatically; the user copies and sends it themselves.

import { useEffect, useState } from "react";
import { ExternalLink, Bookmark, MessageSquareText, Copy, Check } from "lucide-react";
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
  aiScored?: boolean;
  aiScore?: number;
  aiConfidence?: string;
  aiReasons?: string[];
  aiEvidence?: string;
  aiGrounded?: boolean;
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
  replyEnabled?: boolean;
};

export default function OpportunityCard({
  item,
  saveLabel,
  saved,
  saving,
  onSave,
  replyEnabled = true,
}: OpportunityCardProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!replyOpen) {
      setReply(null);
      setReplyError(null);
      setCopied(false);
    }
  }, [replyOpen]);

  async function generateReply() {
    setReplyLoading(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: item.id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.message === "string") {
        setReply(data.message);
      } else if (data?.error === "AI_NOT_CONFIGURED") {
        setReplyError("AI features are not configured yet.");
      } else {
        setReplyError("Could not draft a reply right now. Please try again.");
      }
    } catch {
      setReplyError("Could not draft a reply right now. Please try again.");
    } finally {
      setReplyLoading(false);
    }
  }

  async function copyReply() {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is selectable in the modal anyway.
    }
  }

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

      {item.aiScored ? (
        <div className="mt-2 rounded-lg border border-border bg-sunken px-3 py-2">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text-primary">AI review: </span>
            {typeof item.aiScore === "number" ? `${item.aiScore}/100` : "scored"} ·{" "}
            {item.aiConfidence ?? "low"} confidence
            {item.aiGrounded === false ? " · unverified evidence" : ""}
          </p>
          {item.aiEvidence && (
            <p className="mt-1 text-xs italic leading-relaxed text-text-muted">
              "{item.aiEvidence}"
            </p>
          )}
          {item.aiReasons && item.aiReasons.length > 0 && (
            <p className="mt-1 text-xs text-text-muted">{item.aiReasons.join("; ")}</p>
          )}
        </div>
      ) : item.reasons.length > 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          <span className="font-medium text-text-primary">Why it matched: </span>
          {item.reasons.join("; ")}
        </p>
      ) : null}

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
          variant="secondary"
          className="flex-1"
          onClick={() => setReplyOpen(true)}
          disabled={!replyEnabled}
        >
          <MessageSquareText size={15} />
          Suggest reply
        </Button>
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

      {replyOpen && (
        <div className="mt-4 rounded-xl border border-border bg-sunken p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Suggested reply (draft only, you send it yourself)
          </p>
          {!reply && !replyError && (
            <div className="mt-3">
              <Button size="sm" onClick={generateReply} loading={replyLoading}>
                {replyLoading ? "Drafting..." : "Draft my reply"}
              </Button>
            </div>
          )}
          {replyError && (
            <p className="mt-3 text-sm text-danger">{replyError}</p>
          )}
          {reply && (
            <>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                {reply}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button size="sm" variant="secondary" className="flex-1" onClick={copyReply}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy reply"}
                </Button>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" variant="ghost" className="w-full">
                    Open the post to send it
                  </Button>
                </a>
              </div>
              <p className="mt-2 text-xs text-text-faint">
                TradeCraft never sends messages for you. Review, adjust, and
                send it yourself on the original platform.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}