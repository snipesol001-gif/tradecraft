// The referral rewards resolver. Fires when a referred user completes
// onboarding (the activation condition chosen by the product owner).
//
// Product decisions (owner, locked this session):
//  - Referrer rewards are UNLIMITED: no daily cap.
//  - No IP-based flagging or rejection. ipHash stays stored on the
//    referral record as data only; nothing acts on it.
//  - Referrals never expire.
//  - The referralProgramActive master switch still gates all payouts.
//
// Firestore transaction rule: ALL reads must happen before ANY write. An
// earlier version broke this (it read the referrer balance after writing
// the friend grant) and failed with "transactions require all reads to be
// executed before all writes". This version reads everything, computes,
// then writes everything. One transaction covers the status flip, both
// credit grants (including any due daily refills), the ledger entries,
// and the notifications, so payment is exactly-once and all-or-nothing.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import { getCreditsConfig, computeNextResetAt } from "./credits";

export async function resolveReferralForUser(
  referredUid: string,
  referredUsername: string | null
): Promise<{ outcome: string }> {
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const referralRef = db.collection("referrals").doc(referredUid);

  return db.runTransaction(async (tx) => {
    // ---------------- READS (all before any write) ----------------
    const refSnap = await tx.get(referralRef);
    if (!refSnap.exists) {
      return { outcome: "no_referral" };
    }
    const ref = refSnap.data()!;
    if (ref.status !== "pending") {
      return { outcome: `already_${ref.status}` };
    }
    if (!config.referralProgramActive) {
      return { outcome: "program_inactive" };
    }

    const referrerUid = ref.referrerUid as string;
    const referrerRef = db.collection("users").doc(referrerUid);
    const referredRef = db.collection("users").doc(referredUid);

    const [referrerSnap, referredSnap] = await Promise.all([
      tx.get(referrerRef),
      tx.get(referredRef),
    ]);

    const now = Date.now();

    // Computes a side's current balance, applying the lazy daily reset in
    // memory if one is due. (The lazy reset IS the daily refill; see
    // lib/credits.ts. No writes happen here, only math.)
    const computeState = (data: Record<string, unknown> | undefined) => {
      const balance =
        typeof data?.creditBalance === "number" ? data.creditBalance : null;
      const nextResetAt =
        typeof data?.creditNextResetAt === "number" ? data.creditNextResetAt : null;
      const resetDue =
        balance === null || nextResetAt === null || nextResetAt <= now;
      if (resetDue) {
        return {
          balance: config.dailyFreeCredits,
          resetDue,
          nextResetAt: computeNextResetAt(config.resetHourUtc, now),
        };
      }
      return { balance, resetDue, nextResetAt };
    };

    const referrerState = computeState(referrerSnap.data());
    const friendState = computeState(referredSnap.data());

    // ---------------- WRITES (nothing is read past this point) ----------------

    // Friend: welcome bonus.
    const friendBalanceAfter = friendState.balance + config.referralRewardReferee;
    const friendUpdate: Record<string, unknown> = {
      creditBalance: friendBalanceAfter,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (friendState.resetDue) {
      friendUpdate.creditNextResetAt = friendState.nextResetAt;
      friendUpdate.creditLastResetAt = now;
    }
    tx.set(referredRef, friendUpdate, { merge: true });

    if (friendState.resetDue) {
      tx.create(db.collection("creditLedger").doc(), {
        uid: referredUid,
        delta: config.dailyFreeCredits,
        reason: "daily_allocation",
        refId: null,
        actorUid: null,
        balanceAfter: friendState.balance,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    tx.create(db.collection("creditLedger").doc(), {
      uid: referredUid,
      delta: config.referralRewardReferee,
      reason: "referral_reward_referee",
      refId: referredUid,
      actorUid: null,
      balanceAfter: friendBalanceAfter,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Referrer: reward, unlimited per product decision.
    const referrerBalanceAfter = referrerState.balance + config.referralRewardReferrer;
    const referrerUpdate: Record<string, unknown> = {
      creditBalance: referrerBalanceAfter,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (referrerState.resetDue) {
      referrerUpdate.creditNextResetAt = referrerState.nextResetAt;
      referrerUpdate.creditLastResetAt = now;
    }
    tx.set(referrerRef, referrerUpdate, { merge: true });

    if (referrerState.resetDue) {
      tx.create(db.collection("creditLedger").doc(), {
        uid: referrerUid,
        delta: config.dailyFreeCredits,
        reason: "daily_allocation",
        refId: null,
        actorUid: null,
        balanceAfter: referrerState.balance,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    tx.create(db.collection("creditLedger").doc(), {
      uid: referrerUid,
      delta: config.referralRewardReferrer,
      reason: "referral_reward_referrer",
      refId: referredUid,
      actorUid: null,
      balanceAfter: referrerBalanceAfter,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Referral status flip. This is the exactly-once guarantee: the
    // status is no longer "pending", so any future resolution attempt
    // returns early above.
    tx.update(referralRef, {
      status: "rewarded",
      referrerAmount: config.referralRewardReferrer,
      refereeAmount: config.referralRewardReferee,
      rewardedAt: FieldValue.serverTimestamp(),
      resolvedAt: FieldValue.serverTimestamp(),
    });

    // Notifications (data only for now; the center arrives in STEP 27).
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