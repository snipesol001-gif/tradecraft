import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus } from "@/lib/premium";
import { getPremiumPlansConfig } from "@/lib/premium-config";
import PremiumPlansClient from "@/components/premium/premium-plans-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Explore Premium" };

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) redirect("/login");
  if (!sessionUser.emailVerified) redirect("/verify-email");
  if (!sessionUser.privacyAccepted) redirect("/privacy-consent");
  if (!sessionUser.onboarded) redirect("/onboarding");

  const { ref } = await searchParams;
  const config = await getPremiumPlansConfig();
  const premium = await getPremiumStatus(sessionUser.uid);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Upgrade</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            Explore Premium
          </h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">
            The tools that turn attention into clients, unlocked.
          </p>
        </div>
        {premium.active && (
          <Badge className="border-text-primary bg-surface text-text-primary">
            <Crown size={12} />
            Premium
          </Badge>
        )}
      </div>

      {premium.active ? (
        <Card>
          <CardBody className="p-6">
            <p className="text-sm font-semibold text-text-primary">
              Premium is active on your account.
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {premium.expiresAtMs
                ? `Active until ${new Date(premium.expiresAtMs).toLocaleDateString()}.`
                : "No expiry on this grant."}{" "}
              The Website Analyzer and future Premium tools are unlocked.
            </p>
            <Link
              href="/analyzer"
              className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
            >
              Open the Website Analyzer
            </Link>
          </CardBody>
        </Card>
      ) : (
        <PremiumPlansClient
          paymentsEnabled={config.paymentsEnabled}
          weekly={{ price: config.weeklyPriceNaira, days: config.weeklyDays }}
          monthly={{ price: config.monthlyPriceNaira, days: config.monthlyDays }}
          pendingReference={ref ?? null}
        />
      )}
    </div>
  );
}