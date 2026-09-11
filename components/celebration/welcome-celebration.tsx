"use client";

// Full-screen welcome moment, shown once when a new member finishes
// onboarding. The checkmark draws itself with pure CSS (stroke-dash
// technique), no animation library. The card is the system's single
// "glass" treatment: a blurred dimmed backdrop behind an elevated card
// with a soft light sheen along the top edge. Reduced-motion users see
// everything instantly via the global rule in globals.css.

import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

type WelcomeCelebrationProps = {
  title?: string;
  description?: string;
  dailyCredits?: number | null;
  onContinue: () => void;
};

export default function WelcomeCelebration({
  title = "Welcome to TradeCraft",
  description = "Your profile is complete. The right opportunities can now find you.",
  dailyCredits = null,
  onContinue,
}: WelcomeCelebrationProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm animate-[rise-in_350ms_ease-out] overflow-hidden rounded-2xl border border-border bg-surface-raised p-8 text-center shadow-raised">
        {/* Light sheen along the top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-text-primary/25 to-transparent" />
        {/* Soft monochrome glow behind the badge */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-text-primary/5 blur-3xl" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <svg viewBox="0 0 72 72" className="h-20 w-20 text-success" fill="none" aria-hidden>
            <circle
              cx="36"
              cy="36"
              r="30"
              stroke="currentColor"
              strokeWidth="3"
              className="origin-center animate-[ring-pop_450ms_ease-out]"
              style={{ opacity: 0.35 }}
            />
            <path
              d="M23 37.5 L32.5 47 L49 27.5"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 48,
                strokeDashoffset: 48,
                animation: "check-draw 450ms ease-out 300ms forwards",
              }}
            />
          </svg>
        </div>

        <h2 className="relative mt-5 text-xl font-bold tracking-tight text-text-primary">
          {title}
        </h2>
        <p className="relative mt-2 text-sm leading-relaxed text-text-muted">{description}</p>

        {typeof dailyCredits === "number" && (
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-sunken px-4 py-2">
            <Coins size={15} className="text-warning" />
            <span className="text-sm font-semibold text-text-primary">
              {dailyCredits} daily credits ready
            </span>
          </div>
        )}

        <Button size="lg" className="relative mt-6 w-full" onClick={onContinue}>
          {typeof dailyCredits === "number"
            ? `Claim your ${dailyCredits} daily credits`
            : "Continue to dashboard"}
        </Button>
      </div>
    </div>
  );
}