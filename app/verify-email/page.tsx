// Email verification screen. Deliberately OUTSIDE the gated (app) group,
// because the gate redirects unverified users here. This page checks the
// session itself: no session goes to login, verified users go to dashboard.

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import VerifyEmailForm from "@/components/auth/verify-email-form";

export default async function VerifyEmailPage() {
  const user = await getSessionUser(true);
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="h-16 flex items-center px-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TradeCraft
        </Link>
      </header>
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 break-all">
            {user.email}
          </p>
          <div className="mt-8">
            <VerifyEmailForm email={user.email ?? ""} />
          </div>
        </div>
      </div>
    </main>
  );
}