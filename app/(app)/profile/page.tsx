import { redirect } from "next/navigation";
import { getFirestore } from "firebase-admin/firestore";
import { CheckCircle2, Crown } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getAdminApp } from "@/lib/firebase-admin";
import { ensureReferralCode } from "@/lib/referral";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import ProfileForm from "@/components/profile/profile-form";
import ReferralCard from "@/components/profile/referral-card";
import SignOutButton from "@/components/app/sign-out-button";

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
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
    const signinsSnap = await db
    .collection("loginEvents")
    .where("uid", "==", sessionUser.uid)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  const recentSignins = signinsSnap.docs.map((doc) => {
    const v = doc.data();
    return {
      provider: typeof v.provider === "string" ? v.provider : "Unknown method",
      createdAtMs:
        v.createdAt && typeof v.createdAt.toMillis === "function"
          ? v.createdAt.toMillis()
          : null,
    };
  });

  let referralCode = typeof d.referralCode === "string" ? d.referralCode : null;
  if (!referralCode) {
    referralCode = await ensureReferralCode(sessionUser.uid);
  }

  const displayName = typeof d.displayName === "string" ? d.displayName : "";
  const initial = displayName.charAt(0).toUpperCase() || "T";
  const username = typeof d.username === "string" ? d.username : null;
  const professionalTitle =
    typeof d.professionalTitle === "string" && d.professionalTitle
      ? " · " + d.professionalTitle
      : "";

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-text-primary text-xl font-bold text-background">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary">
              {displayName || "Your profile"}
            </h1>
            {sessionUser.emailVerified && (
              <Badge variant="success">
                <CheckCircle2 size={12} />
                Verified
              </Badge>
            )}
            {sessionUser.premium && (
              <Badge className="border-text-primary bg-surface text-text-primary">
                <Crown size={12} />
                Premium
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            {username ? "@" + username : "No username"}
            {professionalTitle}
          </p>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Email</dt>
            <dd className="break-all text-right font-medium text-text-primary">
              {sessionUser.email}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Sign-in method</dt>
            <dd className="font-medium text-text-primary">{sessionUser.provider}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <p className="eyebrow">Profile details</p>
        <p className="mt-1 text-sm text-text-muted">
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
        <p className="eyebrow">Invite friends</p>
        <p className="mt-1 text-sm text-text-muted">
          Share your link and your code travels with it.
        </p>
        <div className="mt-4">
          <ReferralCard code={referralCode} count={referralCount} />
        </div>
      </section>

            <section>
        <p className="eyebrow">Recent sign-ins</p>
        <p className="mt-1 text-sm text-text-muted">
          Permanent security record. If you do not recognize an entry, reset
          your password immediately.
        </p>
        <Card className="mt-4">
          <CardBody className="space-y-3">
            {recentSignins.length === 0 ? (
              <p className="text-sm text-text-muted">
                No sign-in records yet. They appear here after your next
                sign-in.
              </p>
            ) : (
              recentSignins.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-text-primary">
                    Signed in via {s.provider}
                  </span>
                  <span className="shrink-0 text-xs text-text-faint">
                    {s.createdAtMs ? timeAgo(s.createdAtMs) : ""}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </section>
      <section className="pt-2">
        <div className="mx-auto max-w-xs">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}