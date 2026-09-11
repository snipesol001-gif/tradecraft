"use client";

// Referral card: the user's code, copyable code and invite link with
// toast confirmation, and the real number of people who joined with it.
// Reward amounts arrive with the credits system, stated honestly.

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type ReferralCardProps = {
  code: string;
  count: number;
};

export default function ReferralCard({ code, count }: ReferralCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(kind: "code" | "link") {
    const text = kind === "code" ? code : `${window.location.origin}/?ref=${code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      toast({
        title: kind === "code" ? "Code copied" : "Invite link copied",
        description:
          kind === "code"
            ? "Share it directly, or use the link below."
            : "Anyone signing up through it joins your network.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access. Copy the value manually.",
        variant: "error",
      });
    }
  }

  return (
    <Card className="p-5">
      <p className="eyebrow">Your referral code</p>
      <p className="mt-1.5 font-mono text-2xl font-bold tracking-widest text-text-primary">
        {code}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={() => copy("code")}>
          {copied === "code" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "code" ? "Copied" : "Copy code"}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => copy("link")}>
          {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "link" ? "Copied" : "Copy invite link"}
        </Button>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        {count === 0
          ? "Nobody has joined with your code yet."
          : count === 1
            ? "1 person has joined with your code."
            : `${count} people have joined with your code.`}
      </p>
      <p className="mt-1 text-xs text-text-faint">
        Rewards for successful referrals arrive with the credits system,
        coming soon.
      </p>
    </Card>
  );
}