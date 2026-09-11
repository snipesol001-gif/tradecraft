import Link from "next/link";
import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Radar,
  Search,
  Send,
  Trophy,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Honest capability list. Each item is a real part of TradeCraft, built
// or on the roadmap. Nothing fabricated (no fake logos, counts, or
// testimonials), per the product's no-fake-functionality rule.
const capabilities = [
  "Opportunity scouting from curated sources",
  "AI-scored opportunities for your skills",
  "Lead pipeline with statuses and notes",
  "Website analyzer and AI prompt tools",
  "Referral credits for growing the network",
  "Daily credit refills, free forever tier",
];

const workflow = [
  { label: "Discover", icon: Search, note: "Scouted opportunities, matched to your skills" },
  { label: "Understand", icon: Radar, note: "Scores and reasons, not just keywords" },
  { label: "Connect", icon: Send, note: "Save leads, track every conversation" },
  { label: "Win", icon: Trophy, note: "Turn attention into clients" },
];

const pillars = [
  {
    eyebrow: "Scout",
    title: "Opportunities find you first",
    body: "TradeCraft scouts curated sources continuously and scores what it finds against your skills, so the work that fits you surfaces before the crowd sees it.",
    icon: Radar,
    primary: true,
  },
  {
    eyebrow: "Network",
    title: "A professional graph that shares",
    body: "Follow the people worth following. Repost the right work to the right skill sets. Opportunities move through people, not job boards.",
    icon: Bookmark,
    primary: false,
  },
  {
    eyebrow: "Tools",
    title: "From attention to client",
    body: "A website analyzer and an AI prompt workspace, built to turn interest into signed work. Included with Premium.",
    icon: CheckCircle2,
    primary: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative z-10">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-background">
              T
            </span>
            <span className="font-semibold tracking-tight text-text-primary">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-sunken hover:text-text-primary sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-card transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-32">
          <p className="eyebrow animate-[rise-in_500ms_ease-out]">For independent professionals</p>
          <h1 className="mx-auto mt-4 max-w-3xl animate-[rise-in_500ms_ease-out_80ms_both] text-4xl font-bold leading-[1.08] tracking-tight text-text-primary sm:text-6xl">
            {BRAND.tagline}
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-[rise-in_500ms_ease-out_160ms_both] text-base leading-relaxed text-text-muted sm:text-lg">
            {BRAND.name} scouts real opportunities, scores them against your
            skills, and keeps your pipeline moving. Less searching, more
            working.
          </p>
          <div className="mt-9 flex animate-[rise-in_500ms_ease-out_240ms_both] flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card transition-all duration-150 hover:opacity-90 active:scale-[0.98] sm:w-auto"
            >
              Create free account
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-sunken sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars: one primary, two supporting. Deliberate visual weight,
          not three identical cards. */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow">What TradeCraft does</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Built around how work actually arrives
          </h2>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.eyebrow}
                className={
                  p.primary
                    ? "rounded-2xl border border-border bg-surface p-7 shadow-card"
                    : "rounded-2xl border border-border/60 bg-surface p-7"
                }
              >
                <span
                  className={
                    p.primary
                      ? "flex h-10 w-10 items-center justify-center rounded-xl bg-text-primary text-background"
                      : "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-sunken text-text-primary"
                  }
                >
                  <p.icon size={18} />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-text-faint">
                  {p.eyebrow}
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow strip: a horizontal rhythm change, not another card grid */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow">The workflow</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            From discovery to signed work
          </h2>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, i) => (
              <li key={step.label} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-primary shadow-card">
                    <step.icon size={15} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-text-primary">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capabilities: quiet list, breaks the card rhythm */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Included</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Everything a solo professional needs
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                One account covers discovery, pipeline, and tools. Credits
                refill daily on the free tier, and Premium adds the heavier
                machinery when you are ready.
              </p>
            </div>
            <ul className="space-y-3">
              {capabilities.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-border-strong"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-text-muted" />
                  <span className="text-sm text-text-primary">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA band */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center shadow-card">
            <h2 className="relative mx-auto max-w-xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Your next client is already looking
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-base text-text-muted">
              Set up your profile in two minutes. {BRAND.name} handles the
              searching.
            </p>
            <Link
              href="/signup"
              className="relative mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            >
              Start free
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex h-16 max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-text-faint sm:flex-row sm:px-6">
          <span>
            © {new Date().getFullYear()} {BRAND.name}
          </span>
          <div className="flex gap-5">
            <Link href="/terms" className="transition-colors hover:text-text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-text-primary">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}