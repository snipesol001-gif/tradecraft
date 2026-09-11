// Password reset, step 2. Reads the email from the URL, refuses to render
// the form without a valid one, and hands off to the client form.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import AuthShell from "@/components/auth/auth-shell";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Choose a new password
        </h1>
      </div>

      {validEmail ? (
        <ResetPasswordForm email={validEmail} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This page needs a valid email address to continue.
          </p>
          <Link href="/forgot-password" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Start the reset again
            </Button>
          </Link>
        </div>
      )}
    </AuthShell>
  );
}