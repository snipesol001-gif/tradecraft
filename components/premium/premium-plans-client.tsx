"use client";

// Plan cards and checkout. On redirect return with a reference, verifies
// the payment server-side and shows the honest result.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

type PlanView = {
  id: "weekly" | "monthly";
  label: string;
  priceNaira: number;
  days: number;
};

export default function PremiumPlansClient({
  paymentsEnabled,
  weekly,
  monthly,
  pendingReference,
}: {
  paymentsEnabled: boolean;
  weekly: { price: number; days: number };
  monthly: { price: number; days: number };
  pendingReference: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<"weekly" | "monthly">("monthly");
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans: PlanView[] = [
    { id: "weekly", label: "Weekly", priceNaira: weekly.price, days: weekly.days },
    { id: "monthly", label: "Monthly", priceNaira: monthly.price, days: monthly.days },
  ];

  // On return from Paystack: verify the reference server-side. The
  // webhook may already have activated; the gate is idempotent.
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
          setVerifyResult("Payment confirmed. Premium is active.");
          router.refresh();
        } else if (data?.status === "pending") {
          setVerifyResult("Payment is still processing. This page updates when it completes.");
        } else {
          setVerifyResult("We could not confirm that payment. If you were debited, contact support.");
        }
      } finally {
        setVerifying(false);
      }
    })();
  }, [pendingReference, router]);

  async function startCheckout() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.authorizationUrl === "string") {
        window.location.href = data.authorizationUrl;
        return;
      }
      if (data?.error === "ALREADY_PREMIUM") {
        setError("Premium is already active on your account.");
      } else if (data?.error === "INSUFFICIENT_CREDITS") {
        setError("Insufficient funds.");
      } else {
        setError(data?.error ?? "Could not start the payment. Please try again.");
      }
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
        <Button className="mt-4" onClick={() => router.refresh()}>
          Continue
        </Button>
      </Card>
    );
  }

  const features = [
    "Website Analyzer with client-ready briefs",
    "AI build prompts for redesigns",
    "Priority discovery as platforms activate",
    "Future Premium tools, first",
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-colors",
                isSelected
                  ? "border-text-primary bg-sunken"
                  : "border-border bg-surface hover:border-border-strong"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{plan.label}</span>
                {plan.id === "monthly" && (
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                    Best value
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
                NGN {plan.priceNaira.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-text-faint">
                {plan.days} days of Premium
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardBody>
          <p className="text-sm font-semibold text-text-primary">Everything in Premium</p>
          <ul className="mt-3 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                <Check size={14} className="mt-0.5 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {error && (
        <p className="flex items-start gap-2 text-sm text-danger" role="alert">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {paymentsEnabled ? (
        <Button size="lg" className="w-full" onClick={startCheckout} loading={starting}>
          {starting ? "Opening checkout..." : `Continue with ${selected === "weekly" ? "Weekly" : "Monthly"}`}
        </Button>
      ) : (
        <p className="rounded-lg border border-border bg-sunken px-4 py-3 text-sm text-text-muted">
          Payments are temporarily unavailable. Please check back soon.
        </p>
      )}

      <p className="text-xs leading-relaxed text-text-faint">
        Secure checkout by Paystack. Card and bank transfer supported. Your
        Premium activates automatically once payment is confirmed.
      </p>
    </div>
  );
}