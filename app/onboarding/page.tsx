// The onboarding page. Outside the gated (app) group, because the gate
// redirects un-onboarded users here. This page checks the session itself
// and routes honestly in every direction.

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const user = await getSessionUser(true);
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");
    if (!user.privacyAccepted) redirect("/privacy-consent");
  if (user.onboarded) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="h-16 flex items-center px-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TradeCraft
        </Link>
      </header>
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <OnboardingWizard email={user.email ?? ""} />
        </div>
      </div>
    </main>
  );
}