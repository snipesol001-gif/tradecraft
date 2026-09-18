// Login Security: the owner's permanent sign-in history and admin
// session controls.

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/admin-auth";
import EndSessionsButton from "@/components/admin/end-sessions-button";

export const metadata = { title: "Login Security" };

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminSecurityPage() {
  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  const admin = await verifyAdminSession(ownerEmail);
  const uid = admin.ok ? admin.uid : "";
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const currentHash = currentToken
    ? createHash("sha256").update(currentToken).digest("hex")
    : "";

  const db = getFirestore(getAdminApp());

  // Graceful degradation: a missing composite index (loginEvents uid +
  // createdAt) would throw here. The page renders with a note instead of
  // crashing, and the terminal logs the index creation link.
  let signins: Array<{ id: string; provider: string; ms: number | null }> = [];
  let sessions: Array<{ id: string; expiresAt: number | null }> = [];
  let indexMissing = false;

  try {
    const [signinsSnap, sessionsSnap] = await Promise.all([
      db
        .collection("loginEvents")
        .where("uid", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get(),
      db.collection("adminSessions").where("uid", "==", uid).get(),
    ]);
    signins = signinsSnap.docs.map((doc) => {
      const v = doc.data();
      return {
        id: doc.id,
        provider: typeof v.provider === "string" ? v.provider : "Unknown method",
        ms:
          v.createdAt && typeof v.createdAt.toMillis === "function"
            ? v.createdAt.toMillis()
            : null,
      };
    });
    sessions = sessionsSnap.docs.map((doc) => {
      const v = doc.data();
      return {
        id: doc.id,
        expiresAt: typeof v.expiresAt === "number" ? v.expiresAt : null,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin-security] query failed:", msg);
    if (msg.includes("index")) indexMissing = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">Login Security</h1>
        <p className="mt-1 max-w-lg text-sm text-neutral-400">
          Permanent sign-in history for the owner account, and active admin
          console sessions.
        </p>
      </div>

      {indexMissing && (
        <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
          A one-time database index is needed. Check the VS Code terminal for
          the creation link, click it, then refresh this page.
        </p>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Active admin sessions ({sessions.length})
        </p>
        <div className="mt-3 space-y-2">
          {sessions.map((s) => {
            const isCurrent = s.id === currentHash;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="text-sm text-neutral-300">
                  {isCurrent ? "This session" : "Another open session"}
                </span>
                <span className="text-xs text-neutral-500">
                  {s.expiresAt ? `expires ${timeAgo(s.expiresAt).replace(" ago", " from now")}` : ""}
                </span>
              </div>
            );
          })}
          {sessions.length === 0 && !indexMissing && (
            <p className="text-sm text-neutral-500">No active sessions.</p>
          )}
        </div>
        <div className="mt-3">
          <EndSessionsButton />
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Recent sign-ins (permanent record)
        </p>
        <div className="mt-3 space-y-2">
          {signins.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <span className="text-sm text-neutral-300">Signed in via {s.provider}</span>
              <span className="text-xs text-neutral-500">
                {s.ms ? timeAgo(s.ms) : ""}
              </span>
            </div>
          ))}
          {signins.length === 0 && !indexMissing && (
            <p className="text-sm text-neutral-500">No records yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}