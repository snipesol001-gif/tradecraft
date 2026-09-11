// The privacy consent moment. Sits between email verification and
// onboarding in the gate order. Checks the session itself and routes
// honestly in every direction.

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

  const db = getFirestore(getAdminApp());
  const snap = await db.collection("users").doc(user.uid).get();
  const termsAccepted = typeof snap.data()?.legal?.acceptedTermsVersion === "string";

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-text-primary">
            TradeCraft
          </Link>
          <p className="text-xs text-text-faint">Version {PRIVACY_VERSION}</p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <p className="text-sm text-text-muted">
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