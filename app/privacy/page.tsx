import Link from "next/link";
import { BRAND } from "@/lib/brand";
import LegalDocumentView from "@/components/legal/legal-document";
import { PRIVACY, LEGAL_LAST_UPDATED, PRIVACY_VERSION } from "@/lib/legal-content";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight text-text-primary">
            {BRAND.name}
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <p className="text-xs text-text-faint">
              v{PRIVACY_VERSION} · {LEGAL_LAST_UPDATED}
            </p>
          </div>
        </div>
      </header>
      <LegalDocumentView doc={PRIVACY} />
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 text-sm text-text-faint sm:px-6">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <Link href="/terms" className="transition-colors hover:text-text-primary">
            Terms of Service
          </Link>
        </div>
      </footer>
    </main>
  );
}