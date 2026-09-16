import Link from "next/link";
import { ArrowUpRight, Bookmark, Globe, Radar, UserPlus } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { CheckCircle2, Crown } from "lucide-react";
import CreditsCard from "@/components/app/credits-card";

// Quick actions. Unbuilt destinations are labeled honestly with "Soon".
const actions = [
  {
    label: "Find opportunities",
    hint: "Scouted and scored for your skills",
    href: "/scout",
    icon: Radar,
    soon: false,
    premium: false,
  },
  {
    label: "Analyze a website",
    hint: "Premium audit with client brief",
    href: "/analyzer",
    icon: Globe,
    soon: false,
    premium: true,
  },
  {
    label: "Your leads",
    hint: "Track everyone you contact",
    href: "/leads",
    icon: Bookmark,
    soon: false,
    premium: false,
  },
  {
    label: "Invite friends",
    hint: "Earn credits per referral",
    href: "/profile",
    icon: UserPlus,
    soon: false,
    premium: false,
  },
];

const roadmap = [
  "Opportunity scouting from live platforms, as API access opens",
  "Suggested replies in the leads pipeline",
  "Premium background discovery and alerts",
];

export default async function DashboardPage() {
  // The layout already performed the authoritative checks. This lighter
  // call just reads display information.
  const user = await getSessionUser(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Home</h1>
          <p className="mt-1 text-sm text-text-muted">Signed in as {user?.email}</p>
        </div>
        {user?.emailVerified && (
          <Badge variant="success">
            <CheckCircle2 size={12} />
            Verified
          </Badge>
        )}
      </div>

      <CreditsCard />

      <section>
        <p className="eyebrow mb-3">Quick actions</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <Link key={a.label} href={a.href} className="group">
              <Card variant="interactive" className="h-full p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-sunken text-text-primary">
                    <a.icon size={17} />
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="text-text-faint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-primary"
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-text-primary">{a.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">{a.hint}</p>
                {a.premium && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-primary">
                    <Crown size={10} />
                    Premium
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">Coming to TradeCraft</p>
        <Card>
          <CardBody className="space-y-3">
            {roadmap.map((item) => (
              <div key={item} className="flex items-center justify-between gap-4">
                <span className="text-sm text-text-muted">{item}</span>
                <span className="shrink-0 text-xs text-text-faint">In development</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}