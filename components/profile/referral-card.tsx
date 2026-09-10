"use client";

// Referral card: the user's code, a copyable invite link, and the real
// number of people who joined with it. Reward amounts arrive with the
// credits system in a later phase, stated honestly rather than faked.

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type ReferralCardProps = {
  code: string;
  count: number;
};

export default function ReferralCard({ code, count }: ReferralCardProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(kind: "code" | "link") {
    const text = kind === "code" ? code : `${window.location.origin}/?ref=${code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be blocked. The values are visible on screen.
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5">
      <p className="text-xs uppercase tracking-wide text-neutral-400">Your referral code</p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{code}</p>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => copy("code")}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          {copied === "code" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
        <button
          onClick={() => copy("link")}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
          {copied === "link" ? "Copied" : "Copy invite link"}
        </button>
      </div>

      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        {count === 0
          ? "Nobody has joined with your code yet."
          : count === 1
            ? "1 person has joined with your code."
            : `${count} people have joined with your code.`}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
        Rewards for successful referrals arrive with the credits system,
        coming soon.
      </p>
    </div>
  );
}