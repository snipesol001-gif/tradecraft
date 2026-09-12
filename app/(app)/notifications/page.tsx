"use client";

// The notification center. Live list, relative timestamps that refresh
// every 30 seconds, click to mark read and open the target, mark all
// read, and the pop-up toast preference switch (stored locally).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString();
}

function NotificationRow({
  n,
  onOpen,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150",
        n.read
          ? "border-border/60 bg-surface"
          : "border-border bg-sunken hover:border-border-strong"
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          n.read ? "bg-transparent" : "bg-text-primary"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text-primary">{n.title}</span>
          <span className="shrink-0 text-xs text-text-faint">{timeAgo(n.createdAtMs)}</span>
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-text-muted">{n.body}</span>
      </span>
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, loading, error, indexUrl, markRead, markAllRead } =
    useNotifications();
  const [toastsOn, setToastsOn] = useState(true);

  // Load the toast preference once. It lives in localStorage for now;
  // a server-side preference field can replace it in a later phase.
  useEffect(() => {
    try {
      setToastsOn(localStorage.getItem("tc-toasts-enabled") !== "off");
    } catch {
      // Unavailable storage: default on.
    }
  }, []);

  // Refresh relative timestamps periodically without touching the network.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function toggleToasts() {
    const next = !toastsOn;
    setToastsOn(next);
    try {
      localStorage.setItem("tc-toasts-enabled", next ? "on" : "off");
    } catch {
      // Non-fatal: the toggle still applies for this session.
    }
  }

  function handleOpen(n: AppNotification) {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {unreadCount === 0
              ? "You are all caught up."
              : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck size={15} />
            Mark all read
          </Button>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={toastsOn}
          onChange={toggleToasts}
          className="accent-neutral-900 dark:accent-white"
        />
        Show pop-up toasts for new notifications
      </label>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-danger">
              {indexUrl
                ? "One-time setup: a database index for notifications needs to be created. This takes about a minute."
                : "Could not load notifications. Please refresh and try again."}
            </p>
            {indexUrl && (
              <a href={indexUrl} target="_blank" rel="noopener noreferrer">
                <Button>Create the index, then refresh this page</Button>
              </a>
            )}
          </CardBody>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-sunken text-text-muted">
              <Bell size={20} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-text-primary">
              No notifications yet
            </h2>
            <p className="mt-1 max-w-xs text-sm text-text-muted">
              Referral rewards and account updates will land here. Invite
              friends from your profile to get started.
            </p>
            <Link href="/profile" className="mt-5">
              <Button variant="secondary">Go to profile</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}