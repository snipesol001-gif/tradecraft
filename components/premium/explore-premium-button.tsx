"use client";

// The Profile Explore Premium entry: opens the upgrade modal instead of
// navigating away. Free accounts see this; Premium accounts do not.

import { useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PremiumModal from "@/components/premium/premium-modal";

export default function ExplorePremiumButton({
  paymentsEnabled,
  weeklyPrice,
  monthlyPrice,
  premiumPlusPrice,
}: {
  paymentsEnabled: boolean;
  weeklyPrice: number;
  monthlyPrice: number;
  premiumPlusPrice: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link href="/premium" className="block sm:hidden">
        <Card variant="interactive" className="p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-sunken text-text-primary">
              <Crown size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">Explore Premium</p>
              <p className="mt-0.5 text-xs text-text-muted">
                The Website Analyzer, premium themes, and more.
              </p>
            </div>
          </div>
        </Card>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden w-full text-left sm:block"
      >
        <Card variant="interactive" className="p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-sunken text-text-primary">
              <Crown size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">Explore Premium</p>
              <p className="mt-0.5 text-xs text-text-muted">
                The Website Analyzer, premium themes, and more.
              </p>
            </div>
          </div>
        </Card>
      </button>

      <PremiumModal
        open={open}
        onClose={() => setOpen(false)}
        paymentsEnabled={paymentsEnabled}
        weeklyPrice={weeklyPrice}
        monthlyPrice={monthlyPrice}
        premiumPlusPrice={premiumPlusPrice}
      />
    </>
  );
}