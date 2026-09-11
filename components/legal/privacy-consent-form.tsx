"use client";

// The consent controls under the policy. On success the session is
// refreshed so the new claim travels in the cookie, then the flow moves
// on. The welcome celebration lives at onboarding completion, not here.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
        // Acceptance is recorded server-side regardless.
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

      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-16 sm:px-6">
        {needsTerms && (
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={termsOk}
              onChange={(e) => setTermsOk(e.target.checked)}
              className="mt-0.5 accent-neutral-900 dark:accent-white"
            />
            <span className="text-sm text-text-muted">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium underline underline-offset-4"
              >
                Terms of Service
              </Link>
              .
            </span>
          </label>
        )}

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={privacyOk}
            onChange={(e) => setPrivacyOk(e.target.checked)}
            className="mt-0.5 accent-neutral-900 dark:accent-white"
          />
          <span className="text-sm text-text-muted">
            I have read and agree to the Privacy Policy.
          </span>
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button size="lg" className="w-full" disabled={!ready} loading={busy} onClick={handleAgree}>
          {busy ? "Saving..." : "Agree and continue"}
        </Button>
      </div>
    </div>
  );
}