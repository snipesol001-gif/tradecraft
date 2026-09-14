"use client";

// The frame for all signed-in pages. Desktop: fixed sidebar with active
// indicators, brand mark, theme toggle, and sign out. Mobile: translucent
// top bar plus a five-item bottom navigation with an active dot. New
// notifications raise the unread badge and fire a toast (unless the user
// switched pop-up toasts off), per the product spec.

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, Bookmark, Home, Radar, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/components/ui/toast";
import SignOutButton from "./sign-out-button";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Scout", href: "/scout", icon: Radar },
  { label: "Leads", href: "/leads", icon: Bookmark },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

// Items whose href carries a query string (Scout, Leads, Notifications
// previously) match the full URL exactly, so only one can ever be active.
// Items without a query also match sub-paths (for example /profile).
function isActive(currentUrl: string, href: string): boolean {
  if (href.includes("?")) {
    return currentUrl === href;
  }
  const path = href.split("?")[0];
  return currentUrl === path || currentUrl.startsWith(path + "/");
}

function BrandMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-background">
      T
    </span>
  );
}

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const { toast } = useToast();
  const onNew = useCallback(
    (n: { title: string; body: string; link: string | null }) => {
      let enabled = true;
      try {
        enabled = localStorage.getItem("tc-toasts-enabled") !== "off";
      } catch {
        // Storage unavailable: default on.
      }
      if (!enabled) return;
      toast({
        title: n.title,
        description: n.body,
        variant: "info",
        durationMs: 6000,
        onClick: () => {
          window.location.href = n.link ?? "/notifications";
        },
      });
    },
    [toast]
  );
  const { unreadCount } = useNotifications(onNew);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <BrandMark />
          <Link href="/dashboard" className="font-semibold tracking-tight text-text-primary">
            TradeCraft
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = isActive(currentUrl, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                  active
                    ? "bg-sunken font-medium text-text-primary"
                    : "text-text-muted hover:bg-sunken hover:text-text-primary"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-text-primary" />
                )}
                <item.icon size={18} />
                {item.label}
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-text-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs text-text-faint">{email}</p>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar: the one deliberate translucent surface */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-semibold tracking-tight text-text-primary">TradeCraft</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-sunken hover:text-text-primary"
          >
            <User size={19} />
          </Link>
        </div>
      </header>

      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 md:pb-12">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = isActive(currentUrl, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-150",
                  active ? "text-text-primary" : "text-text-faint hover:text-text-muted"
                )}
              >
                <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full transition-opacity duration-150",
                    active ? "bg-text-primary opacity-100" : "opacity-0"
                  )}
                />
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-text-primary px-1 text-[9px] font-bold text-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}