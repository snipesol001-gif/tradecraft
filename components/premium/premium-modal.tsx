"use client";

// The Explore Premium modal. Free vs Premium vs Premium+ comparison in
// a centered overlay. Subscribe buttons route to the /premium page with
// the plan preselected (the full-page flow handles checkout), keeping
// this modal a fast discovery surface rather than duplicating checkout.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PlanCard = {
  id: "premium" | "premium_plus";
  name: string;
  priceNaira: number;
  period: string;
  blurb: string;
  features: string[];
};

const FREE_FEATURES = [
  "10 credits per day",
  "Job Feeds browsing and saving",
  "Scout (as platforms activate)",
  "Leads pipeline",
  "Standard themes",
];

const PREMIUM_FEATURES = [
  "25 credits per day",
  "Everything in Free",
  "Website Analyzer with client briefs",
  "AI build prompts",
  "Premium themes",
  "Premium badge",
];

const PREMIUM_PLUS_FEATURES = [
  "UNLIMITED credits",
  "Everything in Premium",
  "Background automatic Scout discovery",
  "Discovery notifications",
  "Full theme library (20+ themes over time)",
];

export default function PremiumModal({
  open,
  onClose,
  paymentsEnabled,
  weeklyPrice,
  monthlyPrice,
  premiumPlusPrice,
}: {
  open: boolean;
  onClose: () => void;
  paymentsEnabled: boolean;
  weeklyPrice: number;
  monthlyPrice: number;
  premiumPlusPrice: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<"premium" | "premium_plus">("premium_plus");

  // Close on Escape, but NOT on backdrop click: the choice is explicit.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const plans: PlanCard[] = [
    {
      id: "premium",
      name: "Premium",
      priceNaira: weeklyPrice,
      period: "/week",
      blurb: "The full toolkit, billed weekly.",
      features: PREMIUM_FEATURES,
    },
    {
      id: "premium_plus",
      name: "Premium+",
      priceNaira: premiumPlusPrice,
      period: "/month",
      blurb: "Unlimited everything. The complete experience.",
      features: PREMIUM_PLUS_FEATURES,
    },
  ];

  function subscribe() {
    router.push(`/premium?plan=${selected}`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl animate-[dialog-pop_200ms_ease-out] rounded-2xl border border-border bg-surface-raised p-6 shadow-raised sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-sunken hover:text-text-primary"
        >
          <X size={16} />
        </button>

        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-primary">
            <Crown size={22} />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">
            TradeCraft Premium
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
            Unlock the tools that turn attention into clients, and the
            credits to use them without limits.
          </p>
        </div>

        {/* Free comparison */}
        <div className="mt-6 rounded-xl border border-border bg-sunken px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text-primary">Free</span>
            <span className="text-xs text-text-faint">Your current tier</span>
          </div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-text-muted">
                <Check size={11} className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Paid plans */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "relative rounded-xl border p-4 text-left transition-all duration-150",
                  isSelected
                    ? "border-text-primary ring-2 ring-text-primary/25 bg-sunken"
                    : "border-border bg-surface hover:border-border-strong"
                )}
              >
                {plan.id === "premium_plus" && (
                  <span className="absolute -top-2 left-4 rounded-full bg-text-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">
                    Unlimited
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">{plan.name}</span>
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-text-primary text-background">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-1.5">
                  <span className="text-xl font-bold text-text-primary">
                    NGN {plan.priceNaira.toLocaleString()}
                  </span>
                  <span className="text-xs text-text-faint">{plan.period}</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">{plan.blurb}</p>
              </button>
            );
          })}
        </div>

        {/* Feature comparison for the selected plan */}
        <div className="mt-4 rounded-xl border border-border bg-sunken px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            {plans.find((p) => p.id === selected)?.name} includes
          </p>
          <ul className="mt-2 space-y-1.5">
            {(plans.find((p) => p.id === selected)?.features ?? []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-primary">
                <Check size={13} className="mt-0.5 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Button size="lg" className="mt-5 w-full" onClick={subscribe}>
          Continue with {plans.find((p) => p.id === selected)?.name}
        </Button>

        {!paymentsEnabled && (
          <p className="mt-3 text-center text-xs text-text-faint">
            Payments are temporarily unavailable. Premium is by invitation
            during early access.
          </p>
        )}

        <p className="mt-3 text-center text-xs text-text-faint">
          Secure checkout by Paystack. Cancel anytime by letting it expire.
        </p>
      </div>
    </div>
  );
}