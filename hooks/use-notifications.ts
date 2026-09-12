"use client";

// Live notifications for the signed-in user. One onSnapshot listener per
// mounted instance, exposing the list, the unread count, and mark-read
// actions. Unread notifications that ARRIVE after the listener attached
// fire the onNew callback exactly once each (the app shell turns that
// into a toast). Pre-existing notifications never fire toasts on load.
//
// Missing index handling: the most common listener failure is a missing
// composite index (uid + createdAt). Firestore returns the exact index
// creation URL inside the error message. We log the full error to the
// console AND extract that URL so the UI can offer a one-click fix.

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/auth";
import { firestore } from "@/lib/firebase";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAtMs: number;
};

export function useNotifications(onNew?: (n: AppNotification) => void) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexUrl, setIndexUrl] = useState<string | null>(null);

  const readyRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const q = query(
        collection(firestore, "notifications"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          const list: AppNotification[] = [];
          for (const d of snap.docs) {
            const v = d.data();
            const createdMs =
              v.createdAt && typeof v.createdAt.toMillis === "function"
                ? v.createdAt.toMillis()
                : 0;
            const item: AppNotification = {
              id: d.id,
              type: typeof v.type === "string" ? v.type : "info",
              title: typeof v.title === "string" ? v.title : "Notification",
              body: typeof v.body === "string" ? v.body : "",
              link: typeof v.link === "string" ? v.link : null,
              read: v.read === true,
              createdAtMs: createdMs,
            };
            list.push(item);
            if (readyRef.current && !item.read && !seenRef.current.has(item.id)) {
              onNewRef.current?.(item);
            }
            seenRef.current.add(item.id);
          }
          setNotifications(list);
          setLoading(false);
          setError(null);
          setIndexUrl(null);
          readyRef.current = true;
        },
        (err) => {
          // Never swallow listener errors: log the full error, and pull
          // the index creation URL out of the message when present.
          console.error("[notifications] listener error:", err);
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
          setIndexUrl(match ? match[0] : null);
          setError("Could not load notifications.");
          setLoading(false);
        }
      );
    });

    return () => {
      cancelled = true;
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await updateDoc(doc(firestore, "notifications", id), { read: true });
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(firestore);
    for (const n of unread) {
      batch.update(doc(firestore, "notifications", n.id), { read: true });
    }
    await batch.commit();
  }

  return { notifications, unreadCount, loading, error, indexUrl, markRead, markAllRead };
}