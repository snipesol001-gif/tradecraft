// The audit log view. Read-only, newest first.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

export const metadata = { title: "Audit Log" };

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminAuditPage() {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(50).get();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">Audit Log</h1>
        <p className="mt-1 max-w-lg text-sm text-neutral-400">
          Every privileged action, newest first. Immutable.
        </p>
      </div>
      <div className="space-y-2">
        {snap.docs.map((doc) => {
          const v = doc.data();
          const ms =
            v.createdAt && typeof v.createdAt.toMillis === "function"
              ? v.createdAt.toMillis()
              : null;
          return (
            <div
              key={doc.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-neutral-100">
                  {typeof v.action === "string" ? v.action : "action"}
                </span>
                <span className="text-xs text-neutral-500">{ms ? timeAgo(ms) : ""}</span>
              </div>
              {typeof v.reason === "string" && v.reason && (
                <p className="mt-1 text-xs text-neutral-500">{v.reason}</p>
              )}
            </div>
          );
        })}
        {snap.empty && <p className="text-sm text-neutral-500">No audit entries yet.</p>}
      </div>
    </div>
  );
}