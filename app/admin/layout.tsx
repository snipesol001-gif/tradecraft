// The standalone admin console layout. A completely separate application
// surface: dark console styling, its own navigation, no user-app shell.
// Every page in this segment verifies the dedicated admin session.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { isOwnerEmail, verifyAdminSession, ADMIN_SESSION_TTL_S } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Premium Management", href: "/admin/premium" },
  { label: "Login Security", href: "/admin/security" },
  { label: "Audit Log", href: "/admin/audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser || !isOwnerEmail(sessionUser.email)) {
    // Non-owners: no console exists. Send them to the vault door, which
    // refuses them honestly.
    redirect("/admin-login");
  }
  const admin = await verifyAdminSession(process.env.OWNER_EMAIL ?? "");
  if (!admin.ok) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Console top bar */}
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-sm font-bold text-neutral-900">
              T
            </span>
            <span className="text-sm font-semibold tracking-tight text-neutral-100">
              TradeCraft Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500">
              Owner session · {Math.round(ADMIN_SESSION_TTL_S / 3600)}h
            </span>
            <Link
              href="/"
              className="text-xs text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-300 hover:underline"
            >
              Exit to app
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6">
        {/* Console sidebar */}
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-neutral-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-neutral-500" />
              <p className="text-xs text-neutral-500">Session verified</p>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
              Actions in this console are audit-logged.
            </p>
          </div>
        </aside>

        {/* Console content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}