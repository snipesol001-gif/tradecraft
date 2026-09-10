import { getSessionUser } from "@/lib/session";

export default async function DashboardPage() {
  // The layout already performed the authoritative check. This lighter call
  // just reads display information.
  const user = await getSessionUser(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Signed in as {user?.email}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
        <h2 className="font-semibold">Your account is live</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Sign-in method: {user?.provider}. This is the earliest version of
          your dashboard. Features arrive step by step: email verification,
          onboarding, opportunity scouting, and more.
        </p>
      </div>
    </div>
  );
}