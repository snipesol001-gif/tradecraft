// Password reset, step 1. Outside the gated (app) group on purpose:
// people who forgot their password are, by definition, signed out.

import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="mb-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Enter your email and we will send you a 6-digit code.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-8 text-center text-sm text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}