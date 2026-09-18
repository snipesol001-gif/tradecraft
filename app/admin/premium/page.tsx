// Premium management inside the console. Same engine as before, now in
// the dark console skin.

import PremiumManager from "@/components/admin/premium-manager";

export const metadata = { title: "Premium Management" };

export default function AdminPremiumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100">
          Premium Management
        </h1>
        <p className="mt-1 max-w-lg text-sm text-neutral-400">
          Grant or revoke Premium by email. Every action requires a reason
          and is written to the audit log.
        </p>
      </div>
      <div className="[&_input]:border-neutral-700 [&_input]:bg-neutral-900 [&_input]:text-neutral-100 [&_button]:border-neutral-700 [&_button]:bg-neutral-900 [&_button]:text-neutral-100 [&_form>div>div>button]:border-neutral-700">
        <PremiumManager />
      </div>
    </div>
  );
}