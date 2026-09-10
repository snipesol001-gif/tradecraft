// Minimal dashboard placeholder. Proves the server knows who the visitor is:
// it verifies the session cookie cryptographically before rendering anything.
// The full TradeCraft dashboard shell replaces this page in a later step.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import SignOutButton from "@/components/app/sign-out-button";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;

  if (!session) {
    redirect("/login");
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifySessionCookie(session!, true);
    const provider = decoded.firebase?.sign_in_provider === "google.com"
      ? "Google"
      : "Email and password";

    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
          <h1 className="text-xl font-bold">TradeCraft</h1>
          <p className="mt-4 text-sm">
            Signed in as <span className="font-medium">{decoded.email}</span>
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Method: {provider}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            This page was verified server-side. The real dashboard arrives in a
            later step.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <SignOutButton />
            <Link
              href="/"
              className="text-center text-sm text-neutral-500 dark:text-neutral-400 underline underline-offset-4"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    );
  } catch {
    // Cookie exists but is invalid or expired. Treat as signed out.
    redirect("/login");
  }
}