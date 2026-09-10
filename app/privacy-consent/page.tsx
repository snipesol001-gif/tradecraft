// The privacy consent moment. Sits between email verification and
// onboarding in the gate order. Checks the session itself and routes
// honestly in every direction, like the other ungated pages.

import { redirect } from "next/navigation";
import Link from "next/link";
import { getFirestore } from "firebase-admin/firestore";
import { getSessionUser } from "@/lib/session";
import { getAdminApp } from "@/lib/firebase-admin";
import { PRIVACY_VERSION } from "@/lib/legal-content";
import PrivacyConsentForm from "@/components/legal/privacy-consent-form";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyConsentPage() {
  const user = await getSessionUser(true);
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");
  if (user.privacyAccepted) redirect(user.onboarded ? "/dashboard" : "/onboarding");

  // Backstop: users who never saw the signup checkbox (Google sign-up via
  // the login page) accept Terms here too.
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("users").doc(user.uid).get();
  const termsAccepted = typeof snap.data()?.legal?.acceptedTermsVersion === "string";

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            TradeCraft
          </Link>
          <p className="text-xs text-neutral-500">Version {PRIVACY_VERSION}</p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Before you continue, please read our Privacy Policy. It explains
          what we collect and how we protect it.
        </p>
      </div>
      <PrivacyConsentForm
        nextPath={user.onboarded ? "/dashboard" : "/onboarding"}
        needsTerms={!termsAccepted}
      />
    </main>
  );
}