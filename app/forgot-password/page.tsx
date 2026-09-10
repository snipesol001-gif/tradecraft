// Password reset, step 1. Outside the gated (app) group on purpose:
// people who forgot their password are, by definition, signed out.

import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TradeCraft
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Enter your email and we will send you a 6-digit code.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Remembered it?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}