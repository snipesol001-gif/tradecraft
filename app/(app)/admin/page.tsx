// The admin area. Phase 5 scope: Premium management only. Owner-gated
// server-side via OWNER_EMAIL. Non-owners receive a 404: admin routes
// should not confirm their own existence to strangers. Phase 7 expands
// this page into the full admin console.

import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import PremiumManager from "@/components/admin/premium-manager";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const sessionUser = await getSessionUser(true);
  if (!sessionUser) notFound();

  const ownerEmail = process.env.OWNER_EMAIL ?? "";
  if (!ownerEmail || sessionUser.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Admin</p>
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