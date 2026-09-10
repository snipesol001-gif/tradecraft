import Link from "next/link";
import LegalDocumentView from "@/components/legal/legal-document";
import { PRIVACY, LEGAL_LAST_UPDATED, PRIVACY_VERSION } from "@/lib/legal-content";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            TradeCraft
          </Link>
          <p className="text-xs text-neutral-500">
            Version {PRIVACY_VERSION} · Last updated {LEGAL_LAST_UPDATED}
          </p>
        </div>
      </header>
      <LegalDocumentView doc={PRIVACY} />
    </main>
  );
}