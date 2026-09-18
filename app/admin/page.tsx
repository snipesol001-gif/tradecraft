// Admin console dashboard: overview cards linking the console sections.

import Link from "next/link";
import { Crown, ShieldCheck, ScrollText } from "lucide-react";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const db = getFirestore(getAdminApp());

  const [premiumSnap, auditSnap] = await Promise.all([
    db.collection("users").where("premium.active", "==", true).count().get(),
    db.collection("auditLogs").orderBy("createdAt", "desc").limit(1).get(),
  ]);
  const premiumCount = premiumSnap.data().count;
  const lastAudit = auditSnap.docs[0]?.data();

  const cards = [
    {
      label: "Premium Management",
      href: "/admin/premium",
      icon: Crown,
      stat: `${premiumCount} active`,
    },
    {
      label: "Login Security",
      href: "/admin/security",
      icon: ShieldCheck,
      stat: "Sessions and history",
    },
    {
      label: "Audit Log",
      href: "/admin/audit",
      icon: ScrollText,
      stat: lastAudit?.action ? `Last: ${lastAudit.action}` : "No entries yet",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Console
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-100">
          Dashboard
        </h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-700">
              <c.icon size={18} className="text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-100">{c.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{c.stat}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}