// Connect Accounts: official OAuth/API authorization for Scout discovery.
// Separate from Scout, Leads, Notifications, and Profile. Today every
// platform is in an honest pre-connection state, so no Connect buttons
// exist yet. A Connect button appears only when an official integration
// is genuinely supported. Connecting grants discovery access only, never
// outreach permission.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MinusCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";

type PlatformState = {
  name: string;
  description: string;
  state: "pending_approval" | "requires_paid_api" | "unsupported";
  note: string;
};

// Honest registry. Every entry reflects the real access situation, and
// the page updates as any of them changes.
const PLATFORMS: PlatformState[] = [
  {
    name: "X",
    description: "Public posts where people request freelance help.",
    state: "requires_paid_api",
    note: "The official API tier that allows search is paid. Connect becomes available if that becomes part of the plan.",
  },
  {
    name: "Reddit",
    description: "Public posts from communities where people genuinely ask for freelance help.",
    state: "pending_approval",
    note: "Requires API approval under Reddit's Responsible Builder Policy. An access request is the legitimate path. This updates the moment approval lands.",
  },
  {
    name: "LinkedIn",
    description: "Professional posts and job updates.",
    state: "unsupported",
    note: "No officially supported discovery mechanism is available for this use case today.",
  },
  {
    name: "Facebook",
    description: "Public group and page posts.",
    state: "unsupported",
    note: "No suitable public search API exists for this use case today.",
  },
  {
    name: "Instagram",
    description: "Public posts requesting creative work.",
    state: "unsupported",
    note: "No suitable public search API exists for this use case today.",
  },
  {
    name: "Discord",
    description: "Server community posts.",
    state: "unsupported",
    note: "Search requires a bot inside each individual server; no public search exists.",
  },
];

const STATE_META = {
  pending_approval: { label: "Pending API approval", icon: Clock },
  requires_paid_api: { label: "Paid API required", icon: ShieldAlert },
  unsupported: { label: "Not available", icon: MinusCircle },
} as const;

export const metadata = { title: "Connect Accounts" };

export default function ConnectAccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Authorization</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Connect Accounts
        </h1>
        <p className="mt-1 max-w-lg text-sm text-text-muted">
          Connecting an account authorizes Scout discovery only. TradeCraft
          never sends messages, comments, or follows anyone automatically,
          and never requests permissions for that.
        </p>
      </div>

      <div className="space-y-3">
        {PLATFORMS.map((p) => {
          const meta = STATE_META[p.state];
          return (
            <Card key={p.name}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{p.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{p.description}</p>
                  </div>
                  <Badge>
                    <meta.icon size={11} />
                    {meta.label}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-faint">{p.note}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-text-faint">
        When a platform becomes connectable, its Connect button appears here
        and its Scout card activates automatically. Nothing is simulated in
        the meantime.
      </p>

      <Link href="/scout" className="inline-block">
        <Button variant="secondary" size="sm">
          <ArrowLeft size={14} />
          Back to Scout
        </Button>
      </Link>
    </div>
  );
}