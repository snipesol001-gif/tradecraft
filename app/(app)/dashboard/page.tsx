import { getSessionUser } from "@/lib/session";
import { CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  // The layout already performed the authoritative checks. This lighter call
  // just reads display information.
  const user = await getSessionUser(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Signed in as {user?.email}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          Email verified
        </span>
      </div>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h2 className="font-semibold">Your account is live</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Sign-in method: {user?.provider}. This is the earliest version of
          your dashboard. Features arrive step by step: onboarding, opportunity
          scouting, and more.
        </p>
      </div>
    </div>
  );
}