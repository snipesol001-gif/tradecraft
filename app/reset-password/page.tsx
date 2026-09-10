// Password reset, step 2. Reads the email from the URL, refuses to render
// the form without a valid one, and hands off to the client form.

import Link from "next/link";
import ResetPasswordForm from "@/components/auth/reset-password-form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const validEmail = email && EMAIL_PATTERN.test(email) ? email : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TradeCraft
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Choose a new password</h1>
        </div>

        {validEmail ? (
          <ResetPasswordForm email={validEmail} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              This page needs a valid email address to continue.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full rounded-md border border-neutral-300 dark:border-neutral-700 font-medium py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Start the reset again
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}