// Login Security: the owner's permanent sign-in history and admin
// session controls.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
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

  const db = getFirestore(getAdminApp());
  const signinsSnap = await db
    .collection("loginEvents")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  const sessionsSnap = await db
    .collection("adminSessions")
    .where("uid", "==", uid)
    .get();
  const currentHash = createHash("sha256").update(currentToken).digest("hex");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">Login Security</h1>
        <p className="mt-1 max-w-lg text-sm text-neutral-400">
          Permanent sign-in history for the owner account, and active admin
          console sessions.
        </p>
      </div>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Active admin sessions ({sessionsSnap.size})
        </p>
        <div className="mt-3 space-y-2">
          {sessionsSnap.docs.map((doc) => {
            const d = doc.data();
            const isCurrent = doc.id === currentHash;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="text-sm text-neutral-300">
                  {isCurrent ? "This session" : "Another open session"}
                </span>
                <span className="text-xs text-neutral-500">
                  {typeof d.expiresAt === "number"
                    ? `expires ${timeAgo(d.expiresAt).replace(" ago", " from now")}`
                    : ""}
                </span>
              </div>
            );
          })}
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
          {signinsSnap.docs.map((doc, i) => {
            const v = doc.data();
            const ms =
              v.createdAt && typeof v.createdAt.toMillis === "function"
                ? v.createdAt.toMillis()
                : null;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="text-sm text-neutral-300">
                  Signed in via {typeof v.provider === "string" ? v.provider : "Unknown"}
                </span>
                <span className="text-xs text-neutral-500">{ms ? timeAgo(ms) : ""}</span>
              </div>
            );
          })}
          {signinsSnap.empty && (
            <p className="text-sm text-neutral-500">No records yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}