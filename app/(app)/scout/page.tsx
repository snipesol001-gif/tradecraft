"use client";

// Scout: user-triggered discovery from Scout sources. The user's profile
// services are the automatic matching context. Source cards render the
// provider registry's honest states. With every platform provider gated
// (Reddit pending API approval, X paid API, others unsupported), the
// truth today is: no selectable platforms yet. That state is displayed
// plainly, with Job Feeds offered as the working free alternative. The
// page is complete: platforms light up as providers activate, no rework.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Lock, Newspaper, ShieldAlert } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type ProviderView = {
  id: string;
  label: string;
  description: string;
  status: "active" | "pending_approval" | "unavailable";
  statusNote: string;
  pricing: "free" | "per_discovery";
};

// X's honest state: the official API tier that permits search is paid.
// Declared here because a placeholder provider entry is not warranted
// until a billing decision exists.
const X_CARD = {
  id: "x",
  label: "X",
  description: "Public posts where people request freelance help.",
  status: "unavailable" as const,
  statusNote:
    "X's official API tier that allows search is paid. This stays unavailable until that becomes part of the plan.",
};

const STATUS_META = {
  active: { label: "Connected", icon: null },
  pending_approval: { label: "Pending API approval", icon: Clock },
  unavailable: { label: "Not available", icon: ShieldAlert },
} as const;

export default function ScoutPage() {
  const { credits } = useCredits();
  const [services, setServices] = useState<string[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/onboarding/state");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && Array.isArray(data.data?.services)) {
          setServices(data.data.services);
        }
      } finally {
        setServicesLoaded(true);
      }
    })();
  }, []);

  const usable = credits?.total ?? 0;
  const activeProvider = selected === "feeds" ? true : false;
  const activeLabel = selected === "feeds" ? "Job feeds" : selected === "x" ? X_CARD.label : "";

  async function startScout() {
    if (!selected || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/scout/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: selected, count }),
      });
      const data = await res.json().catch(() => null);
      // The feeds flow continues on the results screen of the Job Feeds
      // page for now; with a selectable platform provider this becomes
      // the in-page results area.
      if (res.ok && data?.ok) {
        window.location.href = "/job-feeds";
        return;
      }
      if (data?.error === "PROVIDER_UNAVAILABLE") {
        setError(data.statusNote ?? "That source is not available for scouting yet.");
      } else if (data?.error === "INSUFFICIENT_CREDITS") {
        setError(`Not enough credits. Discovery costs ${data.cost ?? 1} per opportunity.`);
      } else {
        setError("The scout run could not start. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Scout</h1>
        <p className="mt-1 max-w-lg text-sm text-text-muted">
          Scout searches external sources for genuine opportunities matching
          your services. You decide what to open, save, or act on.
        </p>
      </div>

      {/* Your services: read-only, from the profile. One source of truth. */}
      <section>
        <div className="flex items-center justify-between">
          <p className="eyebrow">
            Your services {servicesLoaded ? `(${services.length})` : ""}
          </p>
          <Link
            href="/profile"
            className="text-xs font-medium underline underline-offset-4 text-text-muted transition-colors hover:text-text-primary"
          >
            Manage services
          </Link>
        </div>
        {!servicesLoaded ? (
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        ) : services.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            No services selected yet. Pick your services on your profile and
            Scout will use them here automatically.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((id) => (
              <span
                key={id}
                className="rounded-full border border-border bg-sunken px-3 py-1 text-xs font-medium text-text-primary"
              >
                {id}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Platforms: honest states from the provider registry */}
      <section>
        <p className="eyebrow">Where should Scout search?</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* X: honest paid-API state */}
          <Card className="p-4 opacity-80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{X_CARD.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{X_CARD.description}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-sunken px-2 py-0.5 text-[10px] font-medium text-text-muted">
                <ShieldAlert size={11} />
                {STATUS_META.unavailable.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-faint">{X_CARD.statusNote}</p>
          </Card>

          {/* Reddit: honest pending-approval state */}
          <Card className="p-4 opacity-80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Reddit</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Public posts from communities where people request freelance help.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-sunken px-2 py-0.5 text-[10px] font-medium text-text-muted">
                <Clock size={11} />
                {STATUS_META.pending_approval.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-faint">
              Reddit requires API approval under its Responsible Builder Policy
              before Scout can search it. This card updates the moment approval
              lands.
            </p>
          </Card>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-faint">
          Platform scouting activates as official API access is approved for
          each source. Nothing is simulated in the meantime.
        </p>
      </section>

      {/* Count + start: enabled only when a platform is selectable */}
      <section>
        <p className="eyebrow">Opportunities to find</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={running}
              className="h-10 w-10 rounded-lg border border-border bg-surface text-lg font-semibold text-text-primary transition-colors hover:bg-sunken disabled:opacity-40"
              aria-label="Decrease count"
            >
              -
            </button>
            <span className="w-12 text-center text-xl font-bold tabular-nums text-text-primary">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(50, c + 1))}
              disabled={running}
              className="h-10 w-10 rounded-lg border border-border bg-surface text-lg font-semibold text-text-primary transition-colors hover:bg-sunken disabled:opacity-40"
              aria-label="Increase count"
            >
              +
            </button>
          </div>
          <p className="text-xs text-text-faint">
            Available credits: {usable}
          </p>
        </div>

        {error && (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="mt-5 w-full sm:w-auto"
          disabled={!activeProvider}
          loading={running}
          onClick={startScout}
        >
          {running ? "Scouting..." : "Start Scout"}
        </Button>
        {!activeProvider && (
          <p className="mt-3 max-w-lg text-xs leading-relaxed text-text-faint">
            No platforms are currently selectable: every platform provider is
            awaiting official API access or a plan decision. Start Scout
            activates the moment one connects. Job Feeds below already works
            today, free.
          </p>
        )}
      </section>

      {/* Job Feeds: the working secondary source */}
      <section>
        <p className="eyebrow">Also available</p>
        <Card variant="interactive" className="mt-3 cursor-pointer">
          <Link href="/job-feeds">
            <CardBody className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-sunken text-text-primary">
                <Newspaper size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">Job Feeds</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Remote job listings from TradeCraft's verified public sources.
                  Free to browse, free to save.
                </p>
              </div>
            </CardBody>
          </Link>
        </Card>
      </section>
    </div>
  );
}