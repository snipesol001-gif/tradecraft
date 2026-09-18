// The admin console. Owner-only via the dedicated admin session. Phase 5
// scope: Premium management. Phase 7 expands this into the full console.

import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isOwnerEmail, verifyAdminSession } from "@/lib/admin-auth";
import PremiumManager from "@/components/admin/premium-manager";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) notFound();

  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!isOwnerEmail(sessionUser.email)) notFound();

  // The admin cookie must be live. If it expired (2 hours), the owner
  // re-opens it from /admin/login with one click.
  const admin = await verifyAdminSession(ownerEmail);
  if (!admin.ok) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Admin console</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Premium management
        </h1>
        <p className="mt-1 max-w-lg text-sm text-text-muted">
          Grant or revoke Premium by email. Every action requires a reason
          and is written to the audit log.
        </p>
      </div>
      <PremiumManager />
    </div>
  );
}