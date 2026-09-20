"use client";

// The Premium plans: Premium (weekly) and Premium+ (monthly). Named
// tiers with differentiated feature lists, per the product spec.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type PlanView = {
  id: "weekly" | "monthly" | "premium_plus";
  name: string;
  priceNaira: number;
  period: string;
  blurb: string;
  features: string[];
};

const premiumFeatures = [
  "25 credits per day (up from 10)",
  "Website Analyzer with client-ready briefs",
  "AI build prompts for redesigns",
  "Premium appearance themes",
  "Premium badge on your profile",
  "Scout queue priority when queues exist",
];

const premiumPlusFeatures = [
  "Everything in Premium",
  "UNLIMITED credits while subscribed",
  "Background automatic Scout discovery",
  "Background discovery notifications",
  "Full appearance theme library (20+ themes)",
];

export default function PremiumPlansClient({
  paymentsEnabled,
  weekly,
  monthly,
  premiumPlus,
  pendingReference,
}: {
  paymentsEnabled: boolean;
  weekly: { price: number; days: number };
  monthly: { price: number; days: number };
  premiumPlus: { price: number; days: number; enabled: boolean };
  pendingReference: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<"weekly" | "premium_plus">("premium_plus");
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans: PlanView[] = [
    {
      id: "weekly",
      name: "Premium",
      priceNaira: weekly.price,
      period: "/week",
      blurb: "The full toolkit, billed weekly.",
      features: premiumFeatures,
    },
    {
      id: "premium_plus",
      name: "Premium+",
      priceNaira: premiumPlus.price,
      period: "/month",
      blurb: "Everything in Premium, plus unlimited credits and autonomy.",
      features: premiumPlusFeatures,
    },
  ];

  // Legacy monthly plan remains purchasable via its deep link but is no
  // longer shown as a card: Premium+ replaces it as the monthly option.

  useEffect(() => {
    if (!pendingReference) return;
    setVerifying(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/premium/verify?reference=${encodeURIComponent(pendingReference)}`
        );
        const data = await res.json().catch(() => null);
        if (res.ok && (data?.ok || data?.alreadyProcessed)) {
          setVerifyResult("Payment confirmed. Your plan is active.");
          router.refresh();
        } else if (data?.status === "pending") {
          setVerifyResult("Payment is still processing. Refresh in a moment.");
        } else {
          setVerifyResult("We could not confirm that payment. If you were debited, contact support.");
        }
      } finally {
        setVerifying(false);
      }
    })();
  }, [pendingReference, router]);

  async function startCheckout(plan: "weekly" | "premium_plus") {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.authorizationUrl === "string") {
        window.location.href = data.authorizationUrl;
        return;
      }
      setError(data?.error ?? "Could not start the payment. Please try again.");
    } catch {
      setError("Could not start the payment. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  if (verifying) {
    return (
      <Card>
        <CardBody className="p-6 text-center">
          <p className="text-sm font-medium text-text-primary">Confirming your payment...</p>
          <p className="mt-1 text-xs text-text-faint">This takes a few seconds.</p>
        </CardBody>
      </Card>
    );
  }

  if (verifyResult) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm font-medium text-text-primary">{verifyResult}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = selected === plan.id;
          const isPlus = plan.id === "premium_plus";
          const disabled = isPlus && !premiumPlus.enabled;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => !disabled && setSelected(plan.id)}
              disabled={disabled}
              className={cn(
                "relative rounded-2xl border p-5 text-left transition-all duration-150",
                disabled && "opacity-50",
                isSelected
                  ? "border-text-primary ring-2 ring-text-primary/25 bg-sunken"
                  : "border-border bg-surface hover:border-border-strong"
              )}
            >
              {isPlus && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-text-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                  Everything + Unlimited
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-text-primary">{plan.name}</span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-background">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="mt-2">
                <span className="text-3xl font-bold tracking-tight text-text-primary">
                  NGN {plan.priceNaira.toLocaleString()}
                </span>
                <span className="text-sm text-text-faint">{plan.period}</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">{plan.blurb}</p>
              <ul className="mt-4 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-text-muted">
                    <Check size={13} className="mt-0.5 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="flex items-start gap-2 text-sm text-danger" role="alert">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {paymentsEnabled ? (
        <Button
          size="lg"
          className="w-full"
          loading={starting}
          onClick={() => startCheckout(selected)}
        >
          {starting
            ? "Opening checkout..."
            : selected === "premium_plus"
              ? "Subscribe to Premium+"
              : "Subscribe to Premium"}
        </Button>
      ) : (
        <p className="rounded-lg border border-border bg-sunken px-4 py-3 text-sm text-text-muted">
          Payments are temporarily unavailable. Please check back soon.
        </p>
      )}

      <p className="text-xs leading-relaxed text-text-faint">
        Secure checkout by Paystack. Card and bank transfer supported. Your
        plan activates automatically once payment is confirmed. Cancel anytime
        by letting it expire; no auto-renewal in this version.
      </p>
    </div>
  );
}