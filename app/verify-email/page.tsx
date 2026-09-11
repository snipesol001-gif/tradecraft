// Email verification screen. Deliberately OUTSIDE the gated (app) group,
// because the gate redirects unverified users here. This page checks the
// session itself: no session goes to login, verified users go to dashboard.

import { redirect } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import VerifyEmailForm from "@/components/auth/verify-email-form";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  const user = await getSessionUser(true);
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-background">
            T
          </span>
          <span className="font-semibold tracking-tight text-text-primary">TradeCraft</span>
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-sunken text-text-primary">
              <MailCheck size={20} />
            </span>
            <p className="eyebrow mt-5">One more step</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
              Verify your email
            </h1>
            <p className="mt-1.5 break-all text-sm text-text-muted">{user.email}</p>
          </div>
          <VerifyEmailForm email={user.email ?? ""} />
        </div>
      </div>
    </main>
  );
}