// The referral rewards resolver. Product decisions locked by the owner:
// unlimited referrer rewards, no IP action, no expiry, master switch
// governs all payouts. Rewards are EARNED credits: they never reset.
// Reads-before-writes transaction structure (see comments in credits.ts).

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import { getCreditsConfig, computeBuckets, writeBuckets } from "./credits";

export async function resolveReferralForUser(
  referredUid: string,
  referredUsername: string | null
): Promise<{ outcome: string }> {
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const referralRef = db.collection("referrals").doc(referredUid);

  return db.runTransaction(async (tx) => {
    // ---------------- READS ----------------
    const refSnap = await tx.get(referralRef);
    if (!refSnap.exists) return { outcome: "no_referral" };
    const ref = refSnap.data()!;
    if (ref.status !== "pending") return { outcome: `already_${ref.status}` };
    if (!config.referralProgramActive) return { outcome: "program_inactive" };

    const referrerUid = ref.referrerUid as string;
    const referrerRef = db.collection("users").doc(referrerUid);
    const referredRef = db.collection("users").doc(referredUid);
    const [referrerSnap, referredSnap] = await Promise.all([
      tx.get(referrerRef),
      tx.get(referredRef),
    ]);

    const now = Date.now();
    const referrerState = computeBuckets(referrerSnap.data(), config, now);
    const friendState = computeBuckets(referredSnap.data(), config, now);

    // ---------------- WRITES ----------------
    // Friend: welcome bonus as EARNED credits (never resets).
    const friendEarnedAfter = friendState.earned + config.referralRewardReferee;
    writeBuckets(
      tx,
      referredRef,
      referredUid,
      { ...friendState, earned: friendEarnedAfter, resetDue: false }
    );
    tx.create(db.collection("creditLedger").doc(), {
      uid: referredUid,
      delta: config.referralRewardReferee,
      reason: "referral_reward_referee",
      refId: referredUid,
      actorUid: null,
      balanceAfter: friendEarnedAfter + friendState.daily,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Referrer: reward as EARNED credits, unlimited.
    const referrerEarnedAfter = referrerState.earned + config.referralRewardReferrer;
    writeBuckets(
      tx,
      referrerRef,
      referrerUid,
      { ...referrerState, earned: referrerEarnedAfter, resetDue: false }
    );
    tx.create(db.collection("creditLedger").doc(), {
      uid: referrerUid,
      delta: config.referralRewardReferrer,
      reason: "referral_reward_referrer",
      refId: referredUid,
      actorUid: null,
      balanceAfter: referrerEarnedAfter + referrerState.daily,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.update(referralRef, {
      status: "rewarded",
      referrerAmount: config.referralRewardReferrer,
      refereeAmount: config.referralRewardReferee,
      rewardedAt: FieldValue.serverTimestamp(),
      resolvedAt: FieldValue.serverTimestamp(),
    });

    tx.create(db.collection("notifications").doc(), {
      uid: referrerUid,
      type: "referral_reward",
      title: "New referral",
      body: `@${referredUsername ?? "a new member"} joined TradeCraft using your referral code. +${config.referralRewardReferrer} credits.`,
      link: "/profile",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection("notifications").doc(), {
      uid: referredUid,
      type: "welcome_bonus",
      title: "Welcome bonus",
      body: `You joined through a referral and received +${config.referralRewardReferee} credits.`,
      link: "/dashboard",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { outcome: "rewarded" };
  });
}