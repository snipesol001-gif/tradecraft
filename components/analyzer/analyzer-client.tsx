"use client";

// The analyzer run form and results. Progress is honest: analyzing takes
// real time (fetch plus AI), stated up front. Results render measured
// scores with reasons, the client brief, and a copyable build prompt.

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Dimension = { score: number; reason: string };

type AnalyzerResponse = {
  ok?: boolean;
  error?: string;
  note?: string;
  runId?: string;
  url?: string;
  result?: {
    overallScore: number;
    summary: string;
    dimensions: Record<string, Dimension>;
    strengths: string[];
    weaknesses: string[];
    brief: string;
    buildPrompt: string;
  };
  extraction?: { title: string; wordCount: number; headings: string[] };
};

const DIMENSION_LABELS: Record<string, string> = {
  clarity: "Clarity",
  offer: "Offer",
  trust: "Trust",
  callToAction: "Call to action",
  contentDepth: "Content depth",
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
      <div
        className="h-full rounded-full bg-text-primary transition-all duration-500"
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function CopyBox({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: text is selectable anyway.
    }
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
        {text}
      </p>
    </div>
  );
}

export default function AnalyzerClient() {
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzerResponse | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (running || !url.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyzer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: AnalyzerResponse = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResult(data);
      } else {
        setError(data?.error ?? "The analysis could not run. Please try again.");
      }
    } catch {
      setError("The analysis could not run. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  const r = result?.result;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={analyze} className="space-y-4">
          <div>
            <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-text-primary">
              Website URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                />
                <Input
                  id="url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="pl-9"
                />
              </div>
              <Button type="submit" size="lg" loading={running} className="sm:w-40">
                {running ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-text-faint">
              Public https:// websites only. Analyzing usually takes 15 to 40
              seconds.
            </p>
          </div>
          {error && (
            <p className="flex items-start gap-2 text-sm text-danger" role="alert">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </form>
      </Card>

      {running && (
        <div className="space-y-3">
          <p className="eyebrow">Analyzing, this is real work and takes a moment</p>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {result?.result && r && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="eyebrow">Overall score</p>
                <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-text-primary">
                  {r.overallScore}
                  <span className="text-lg font-medium text-text-faint">/100</span>
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
                  {r.summary}
                </p>
              </div>
              <a href={result.url ?? "#"} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink size={14} />
                  View site
                </Button>
              </a>
            </div>
            {result.extraction && (
              <p className="mt-4 border-t border-border pt-3 text-xs text-text-faint">
                Measured: "{result.extraction.title}" · {result.extraction.wordCount} words ·{" "}
                {result.extraction.headings.length} headings detected
              </p>
            )}
          </Card>

          <section>
            <p className="eyebrow mb-3">Dimension scores</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(r.dimensions).map(([key, dim]) => (
                <Card key={key} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      {DIMENSION_LABELS[key] ?? key}
                    </p>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {dim.score}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ScoreBar score={dim.score} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{dim.reason}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm font-semibold text-text-primary">Strengths</p>
              <ul className="mt-2 space-y-2">
                {r.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check size={14} className="mt-0.5 shrink-0 text-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold text-text-primary">Weaknesses</p>
              <ul className="mt-2 space-y-2">
                {r.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
                    {w}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <CopyBox title="Client-ready improvement brief" text={r.brief} />
          <CopyBox title="AI build prompt" text={r.buildPrompt} />

          <p className="text-xs leading-relaxed text-text-faint">
            The brief is written to be sent to the site owner. The build
            prompt creates an original improved site, it never copies the
            existing one's text or branding.
          </p>
        </div>
      )}
    </div>
  );
}