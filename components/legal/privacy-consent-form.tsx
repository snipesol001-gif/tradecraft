"use client";

// The consent controls under the policy. The checkbox is required, the
// button stays until the user chooses, and after agreeing the session is
// refreshed so the new claim travels in the cookie. Never shown again
// once accepted (the gate stops redirecting here).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import LegalDocumentView from "./legal-document";
import { PRIVACY, TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legal-content";

type PrivacyConsentFormProps = {
  nextPath: string;
  needsTerms: boolean;
};

export default function PrivacyConsentForm({ nextPath, needsTerms }: PrivacyConsentFormProps) {
  const router = useRouter();
  const [termsOk, setTermsOk] = useState(!needsTerms);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(document: "terms" | "privacy", version: string) {
    const res = await fetch("/api/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document, version }),
    });
    if (!res.ok) throw new Error("accept-failed");
  }

  async function handleAgree() {
    setError(null);
    setBusy(true);
    try {
      if (needsTerms) await accept("terms", TERMS_VERSION);
      await accept("privacy", PRIVACY_VERSION);
      // Refresh the session so the fresh claim is inside the cookie.
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (idToken) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        }
      } catch {
        // Acceptance is recorded server-side regardless. A fresh sign-in
        // receives a cookie with the claim either way.
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not record your consent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const ready = termsOk && privacyOk;

  return (
    <div>
      <LegalDocumentView doc={PRIVACY} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16 space-y-4">
        {needsTerms && (
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={termsOk}
              onChange={(e) => setTermsOk(e.target.checked)}
              className="mt-0.5 accent-neutral-900 dark:accent-white"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="underline underline-offset-4 font-medium"
              >
                Terms of Service
              </Link>
              .
            </span>
          </label>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={privacyOk}
            onChange={(e) => setPrivacyOk(e.target.checked)}
            className="mt-0.5 accent-neutral-900 dark:accent-white"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            I have read and agree to the Privacy Policy.
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleAgree}
          disabled={!ready || busy}
          className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold py-3 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Agree and continue"}
        </button>
      </div>
    </div>
  );
}