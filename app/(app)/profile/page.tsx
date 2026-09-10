// Profile page. A server component: it reads the user document and the
// real referral count directly, then hands editable values to the client
// form. If an account somehow has no referral code yet, one is created
// here (ensureReferralCode is idempotent).

import SignOutButton from "@/components/app/sign-out-button";
import { redirect } from "next/navigation";
import { getFirestore } from "firebase-admin/firestore";
import { getSessionUser } from "@/lib/session";
import { getAdminApp } from "@/lib/firebase-admin";
import { ensureReferralCode } from "@/lib/referral";
import ProfileForm from "@/components/profile/profile-form";
import ReferralCard from "@/components/profile/referral-card";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const sessionUser = await getSessionUser(false);
  if (!sessionUser) redirect("/login");

  const db = getFirestore(getAdminApp());
  const snap = await db.collection("users").doc(sessionUser.uid).get();
  const d = snap.data() ?? {};

  const countSnap = await db
    .collection("referrals")
    .where("referrerUid", "==", sessionUser.uid)
    .count()
    .get();
  const referralCount = countSnap.data().count;

  let referralCode = typeof d.referralCode === "string" ? d.referralCode : null;
  if (!referralCode) {
    referralCode = await ensureReferralCode(sessionUser.uid);
  }

  const displayName = typeof d.displayName === "string" ? d.displayName : "";
  const initial = displayName.charAt(0).toUpperCase() || "T";

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-xl font-bold">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {displayName || "Your profile"}
            </h1>
            {sessionUser.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {typeof d.username === "string" ? "@" + d.username : "No username"}
            {typeof d.professionalTitle === "string" && d.professionalTitle
              ? " · " + d.professionalTitle
              : ""}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium break-all text-right">{sessionUser.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Sign-in method</dt>
            <dd className="font-medium">{sessionUser.provider}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="font-semibold">Profile details</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          This information shapes your matching and how others see you.
        </p>
        <div className="mt-4">
          <ProfileForm
            initial={{
              displayName,
              professionalTitle: typeof d.professionalTitle === "string" ? d.professionalTitle : "",
              country: typeof d.country === "string" ? d.country : "",
              timezone: typeof d.timezone === "string" ? d.timezone : "",
              services: Array.isArray(d.services) ? d.services : [],
              experienceLevel: typeof d.experienceLevel === "string" ? d.experienceLevel : "",
              yearsExperience:
                typeof d.yearsExperience === "number" ? String(d.yearsExperience) : "",
              portfolioUrl: typeof d.portfolioUrl === "string" ? d.portfolioUrl : "",
              websiteUrl: typeof d.websiteUrl === "string" ? d.websiteUrl : "",
            }}
          />
        </div>
      </section>

      <section>
  <h2 className="font-semibold">Invite friends</h2>
  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
    Share your link and your code travels with it.
  </p>
  <div className="mt-4">
    <ReferralCard code={referralCode} count={referralCount} />
  </div>
</section>
<section className="pt-2">
  <div className="w-full flex justify-center">
    <SignOutButton />
  </div>
</section>
    </div>
  );
}