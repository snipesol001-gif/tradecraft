// The Website Analyzer. Premium-gated server-side from the durable
// document check. Free accounts see the honest Explore Premium state;
// Premium accounts get the full tool.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Globe, ShieldCheck, FileText, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getPremiumStatus } from "@/lib/premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import AnalyzerClient from "@/components/analyzer/analyzer-client";

export const metadata = { title: "Website Analyzer" };

function UpgradeState() {
  return (
    <Card className="p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-sunken text-text-primary">
        <Crown size={24} />
      </span>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-text-primary">
        The Website Analyzer is a Premium feature
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-muted">
        Paste any public website and Premium analyzes it for you: structure,
        clarity, trust signals, content depth, with scores, a client-ready
        improvement brief, and a build prompt you can use with any AI tool.
        Everything a freelancer needs to pitch and deliver site improvements.
      </p>
      <div className="mx-auto mt-6 grid max-w-md gap-2 text-left">
        {[
          { icon: Globe, text: "Evidence-based audit of any public website" },
          { icon: FileText, text: "Client-ready improvement brief, copy and go" },
          { icon: Sparkles, text: "AI build prompt for redesigns" },
        ].map((f) => (
          <div
            key={f.text}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <f.icon size={16} className="shrink-0 text-text-muted" />
            <span className="text-sm text-text-primary">{f.text}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-border bg-sunken p-4">
        <p className="text-sm font-medium text-text-primary">Explore Premium</p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Premium is available by invitation during early access, while
          self-serve payments are being prepared. It will be purchasable
          in-app soon.
        </p>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block">
        <Button variant="secondary">Back to dashboard</Button>
      </Link>
    </Card>
  );
}

export default async function AnalyzerPage() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) redirect("/login");
  if (!sessionUser.emailVerified) redirect("/verify-email");
  if (!sessionUser.privacyAccepted) redirect("/privacy-consent");
  if (!sessionUser.onboarded) redirect("/onboarding");

  const premium = await getPremiumStatus(sessionUser.uid);
  if (!premium.active) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-lg">
          <UpgradeState />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Premium tool</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            Website Analyzer
          </h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">
            Paste a public website URL. TradeCraft reads it, audits it with
            AI, and produces scores, a client brief, and a build prompt.
          </p>
        </div>
        <Badge className="border-text-primary bg-surface text-text-primary">
          <Crown size={12} />
          Premium
        </Badge>
      </div>
      <AnalyzerClient />
    </div>
  );
}