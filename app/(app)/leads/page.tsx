"use client";

// The Leads pipeline. Saved opportunities with status management across
// the full flow, inline notes, and archive/restore. Free, always. Each
// lead keeps its snapshot so it stays useful even if the original post
// changes or disappears.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Lead = {
  id: string;
  status: string;
  notes: string;
  createdAtMs: number | null;
  snapshot: {
    title?: string;
    summary?: string;
    url?: string;
    sourceName?: string;
    score?: number;
    publishedAtMs?: number | null;
  };
};

const STATUS_ORDER = [
  "new",
  "reviewed",
  "contacted",
  "replied",
  "negotiating",
  "won",
  "lost",
  "archived",
] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewed: "Reviewed",
  contacted: "Contacted",
  replied: "Replied",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

// Which statuses a lead can move to from its current one. Kept simple
// and generous: anything except a repeat of itself.
function nextStatuses(current: string): string[] {
  return STATUS_ORDER.filter((s) => s !== current);
}

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

function LeadCard({
  lead,
  onStatusChange,
}: {
  lead: Lead;
  onStatusChange: (leadId: string, status: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const snap = lead.snapshot ?? {};

  async function saveNotes() {
    setSaving(true);
    try {
      const res = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, notes }),
      });
      if (res.ok) {
        toast({ title: "Notes saved", variant: "success" });
        setDirty(false);
      } else {
        toast({ title: "Could not save notes", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    const res = await fetch("/api/leads/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, status }),
    });
    if (res.ok) {
      toast({
        title: `Moved to ${STATUS_LABELS[status] ?? status}`,
        variant: "success",
      });
      onStatusChange(lead.id, status);
    } else {
      toast({ title: "Could not update status", variant: "error" });
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            lead.status === "won"
              ? "bg-success text-background"
              : lead.status === "archived" || lead.status === "lost"
                ? "border border-border bg-surface text-text-faint"
                : "border border-border bg-sunken text-text-muted"
          )}
        >
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
        {typeof snap.score === "number" && snap.score > 0 && (
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
            {snap.score}
          </span>
        )}
        <span className="text-xs text-text-faint">
          {snap.sourceName}
          {lead.createdAtMs ? ` · saved ${timeAgo(lead.createdAtMs)}` : ""}
        </span>
      </div>

      <h2 className="mt-2 text-base font-semibold leading-snug text-text-primary">
        {snap.title ?? "Untitled"}
      </h2>
      {snap.summary && (
        <p className="mt-1 text-sm leading-relaxed text-text-muted">{snap.summary}</p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {snap.url && (
          <a href={snap.url} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="secondary" className="w-full">
              <ExternalLink size={15} />
              Open original
            </Button>
          </a>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "Details"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
              Move to
            </p>
            <div className="flex flex-wrap gap-1.5">
              {nextStatuses(lead.status).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor={`notes-${lead.id}`}
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-faint"
            >
              Notes
            </label>
            <textarea
              id={`notes-${lead.id}`}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              rows={3}
              maxLength={5000}
              placeholder="What happened, what was agreed, next steps..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint transition-colors focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ring/25"
            />
            <div className="mt-2 flex items-center gap-3">
              <Button size="sm" onClick={saveNotes} disabled={!dirty} loading={saving}>
                {saving ? "Saving..." : "Save notes"}
              </Button>
              {dirty && !saving && (
                <span className="text-xs text-text-faint">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && Array.isArray(data.leads)) {
          setLeads(data.leads);
        } else if (data?.error === "MISSING_INDEX" && typeof data.indexUrl === "string") {
          setIndexUrl(data.indexUrl);
          setError("A one-time database index is needed for Leads.");
        } else {
          setError("Could not load your leads. Please refresh and try again.");
        }
      } catch {
        setError("Could not load your leads. Please refresh and try again.");
      }
    })();
  }, []);

  async function handleStatusChange(leadId: string, status: string) {
    setLeads((prev) =>
      prev ? prev.map((l) => (l.id === leadId ? { ...l, status } : l)) : prev
    );
  }

  const filtered = useMemo(() => {
    if (!leads) return [];
    return statusFilter === "all"
      ? leads
      : leads.filter((l) => l.status === statusFilter);
  }, [leads, statusFilter]);

  const archivedCount = leads?.filter((l) => l.status === "archived").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Leads</h1>
          <p className="mt-1 text-sm text-text-muted">
            {leads === null
              ? "Loading..."
              : leads.length === 0
                ? "No leads yet. Save opportunities from Scout or Job Feeds."
                : `${leads.length} lead${leads.length === 1 ? "" : "s"} saved. Managing them is free, always.`}
          </p>
        </div>
        <Link href="/scout" className="shrink-0">
          <Button variant="secondary" size="sm">
            Find more
          </Button>
        </Link>
      </div>

      {leads && leads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              statusFilter === "all"
                ? "border-text-primary bg-text-primary text-background"
                : "border-border bg-surface text-text-muted hover:border-border-strong"
            )}
          >
            All ({leads.length})
          </button>
          {STATUS_ORDER.map((s) => {
            const count = leads.filter((l) => l.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "border-text-primary bg-text-primary text-background"
                    : "border-border bg-surface text-text-muted hover:border-border-strong"
                )}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {leads === null && !error ? (
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
      ) : leads.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-muted">
            <Bookmark size={20} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-text-primary">No leads yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            Save opportunities from Scout or Job Feeds and they land here,
            ready to work.
          </p>
          <Link href="/scout" className="mt-5 inline-block">
            <Button>Go to Scout</Button>
          </Link>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-text-muted">
            No leads with this status.{" "}
            {archivedCount > 0 && statusFilter !== "archived"
              ? `${archivedCount} archived lead${archivedCount === 1 ? " is" : "s are"} under the Archived filter.`
              : ""}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}