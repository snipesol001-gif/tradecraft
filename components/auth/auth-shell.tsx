// Shared frame for every authentication screen. Brand header, centered
// column, consistent rhythm. Pages pass their own card content.

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-background">
            T
          </span>
          <span className="font-semibold tracking-tight text-text-primary">TradeCraft</span>
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}