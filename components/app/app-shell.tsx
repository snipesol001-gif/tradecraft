"use client";

// The frame for all signed-in pages. Desktop: left sidebar. Mobile: top bar
// plus bottom navigation (five items, per the product spec). Links that
// point at unbuilt features go to the honest coming-soon page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Home, Radar, User } from "lucide-react";
import SignOutButton from "./sign-out-button";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Scout", href: "/coming-soon?feature=Scout", icon: Radar },
  { label: "Leads", href: "/coming-soon?feature=Leads", icon: Bookmark },
  { label: "Notifications", href: "/coming-soon?feature=Notifications", icon: Bell },
  { label: "Profile", href: "/coming-soon?feature=Profile", icon: User },
];

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="h-16 flex items-center px-5 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            TradeCraft
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-neutral-100 dark:bg-neutral-900"
                    : "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">{email}</p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 h-14 flex items-center px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          TradeCraft
        </Link>
      </header>

      {/* Page content, with room for the mobile bottom bar */}
      <main className="md:pl-60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  active
                    ? "flex flex-col items-center justify-center gap-1 py-2.5 text-neutral-900 dark:text-white"
                    : "flex flex-col items-center justify-center gap-1 py-2.5 text-neutral-500 dark:text-neutral-500"
                }
              >
                <item.icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}