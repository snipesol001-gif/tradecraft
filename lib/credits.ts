// The credit engine, two-bucket model (product owner decision):
//   - creditBalance: EARNED credits (referral rewards, admin grants,
//     future purchases). NEVER reset or expired. Sit until spent.
//   - dailyBalance: the daily allowance. Resets to config.dailyFreeCredits
//     when creditNextResetAt passes (lazy reset; no rollover).
// Spending draws from the daily bucket first, keeping earned credits safe.
// Every change appends a ledger entry. All mutations run in transactions.
//
// Premium+ entitlement: while active, spends cost nothing. The spend is
// still recorded in the ledger with a zero delta, so history stays
// complete and honest. The entitlement check lives in spendCredits (the
// function that actually charges), NOT in getCreditState (a pure read).

import { FieldValue, getFirestore, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";
import { getPremiumPlusStatus } from "./premium";

export type CreditReason =
  | "daily_allocation"
  | "referral_reward_referrer"
  | "referral_reward_referee"
  | "admin_grant"
  | "adjustment"
  | "spend_scout"
  | "spend_analyzer"
  | "spend_ai";

export type CreditsConfig = {
  dailyFreeCredits: number;
  resetHourUtc: number;
  referralRewardReferrer: number;
  referralRewardReferee: number;
  referralMaxRewardsPerDay: number;
  referralProgramActive: boolean;
  scoutDiscoveryCost: number;
};

export type BucketState = {
  earned: number;
  daily: number;
  nextResetAt: number;
  resetDue: boolean;
};

export type CreditState = {
  total: number;
  earned: number;
  daily: number;
  nextResetAt: number;
  dailyAllowance: number;
};

export class InsufficientCreditsError extends Error {
  constructor(public total: number) {
    super("INSUFFICIENT_CREDITS");
  }
}

const CONFIG_TTL_MS = 60_000;
let configCache: { value: CreditsConfig; expiresAt: number } | null = null;

function requireInt(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`config/credits field "${name}" must be a non-negative integer.`);
  }
  return n;
}

export async function getCreditsConfig(): Promise<CreditsConfig> {
  if (configCache && configCache.expiresAt > Date.now()) {
    return configCache.value;
  }
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("config").doc("credits").get();
  if (!snap.exists) {
    throw new Error(
      "Missing Firestore document config/credits. Create it before using credit features."
    );
  }
  const d = snap.data() ?? {};
  const value: CreditsConfig = {
    dailyFreeCredits: requireInt(d.dailyFreeCredits, "dailyFreeCredits"),
    resetHourUtc: requireInt(d.resetHourUtc, "resetHourUtc"),
    referralRewardReferrer: requireInt(d.referralRewardReferrer, "referralRewardReferrer"),
    referralRewardReferee: requireInt(d.referralRewardReferee, "referralRewardReferee"),
    referralMaxRewardsPerDay: requireInt(d.referralMaxRewardsPerDay, "referralMaxRewardsPerDay"),
    referralProgramActive: d.referralProgramActive === true,
    scoutDiscoveryCost:
      d.scoutDiscoveryCost === undefined
        ? 1
        : requireInt(d.scoutDiscoveryCost, "scoutDiscoveryCost"),
  };
  if (value.resetHourUtc > 23) {
    throw new Error('config/credits field "resetHourUtc" must be 0 to 23.');
  }
  configCache = { value, expiresAt: Date.now() + CONFIG_TTL_MS };
  return value;
}

export function computeNextResetAt(resetHourUtc: number, nowMs: number): number {
  const d = new Date(nowMs);
  const todayAtHour = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    resetHourUtc,
    0,
    0,
    0
  );
  return todayAtHour > nowMs ? todayAtHour : todayAtHour + 24 * 60 * 60 * 1000;
}

// READ ONLY. Computes both buckets from a user doc snapshot, applying the
// daily reset in memory if due. No writes. Callers write explicitly.
export function computeBuckets(
  data: Record<string, unknown> | undefined,
  config: CreditsConfig,
  nowMs: number
): BucketState {
  const earned = typeof data?.creditBalance === "number" ? data.creditBalance : 0;
  const storedDaily = typeof data?.dailyBalance === "number" ? data.dailyBalance : null;
  const storedNext = typeof data?.creditNextResetAt === "number" ? data.creditNextResetAt : null;
  const resetDue =
    storedDaily === null || storedNext === null || storedNext <= nowMs;
  return {
    earned,
    daily: resetDue ? config.dailyFreeCredits : storedDaily!,
    nextResetAt:
      storedNext !== null && !resetDue
        ? storedNext
        : computeNextResetAt(config.resetHourUtc, nowMs),
    resetDue,
  };
}

export function writeLedgerEntry(
  tx: Transaction,
  uid: string,
  delta: number,
  reason: CreditReason,
  balanceAfter: number,
  refId?: string,
  actorUid?: string
) {
  const db = getFirestore(getAdminApp());
  tx.create(db.collection("creditLedger").doc(), {
    uid,
    delta,
    reason,
    refId: refId ?? null,
    actorUid: actorUid ?? null,
    balanceAfter,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Writes both buckets. Performs no reads, so it is safe after all reads
// inside a transaction.
export function writeBuckets(
  tx: Transaction,
  userRef: DocumentReference,
  uid: string,
  state: BucketState
) {
  const update: Record<string, unknown> = {
    creditBalance: state.earned,
    dailyBalance: state.daily,
    creditNextResetAt: state.nextResetAt,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (state.resetDue) {
    update.creditLastResetAt = Date.now();
  }
  tx.set(userRef, update, { merge: true });
  if (state.resetDue) {
    writeLedgerEntry(tx, uid, state.daily, "daily_allocation", state.daily);
  }
}

export async function getCreditState(uid: string): Promise<CreditState> {
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const now = Date.now();
    const state = computeBuckets(snap.data(), config, now);
    writeBuckets(tx, userRef, uid, state);
    return {
      total: state.earned + state.daily,
      earned: state.earned,
      daily: state.daily,
      nextResetAt: state.nextResetAt,
      dailyAllowance: config.dailyFreeCredits,
    };
  });
}

export async function grantCredits(params: {
  uid: string;
  amount: number;
  reason: CreditReason;
  refId?: string;
  actorUid?: string;
}): Promise<CreditState> {
  const { uid, amount, reason, refId, actorUid } = params;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("grantCredits requires a positive integer amount.");
  }
  if (reason === "daily_allocation") {
    throw new Error("daily_allocation is produced by the reset, not granted directly.");
  }
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const now = Date.now();
    const state = computeBuckets(snap.data(), config, now);
    const earnedAfter = state.earned + amount;
    tx.set(
      userRef,
      {
        creditBalance: earnedAfter,
        creditNextResetAt: state.nextResetAt,
        dailyBalance: state.daily,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    writeLedgerEntry(tx, uid, amount, reason, earnedAfter, refId, actorUid);
    return {
      total: earnedAfter + state.daily,
      earned: earnedAfter,
      daily: state.daily,
      nextResetAt: state.nextResetAt,
      dailyAllowance: config.dailyFreeCredits,
    };
  });
}

export async function spendCredits(params: {
  uid: string;
  amount: number;
  reason: CreditReason;
  refId?: string;
}): Promise<CreditState> {
  const { uid, amount, reason, refId } = params;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("spendCredits requires a positive integer amount.");
  }
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);

  // Premium+ entitlement: unlimited credits while active. Server-side
  // check, and the ledger records a zero-delta entry so history stays
  // complete and honest. No transaction needed: nothing is deducted.
  const plus = await getPremiumPlusStatus(uid);
  if (plus.active) {
    const state = await getCreditState(uid);
    await db.collection("creditLedger").add({
      uid,
      delta: 0,
      reason,
      refId: refId ?? null,
      actorUid: null,
      balanceAfter: state.total,
      createdAt: FieldValue.serverTimestamp(),
    });
    return {
      total: state.total,
      earned: state.earned,
      daily: state.daily,
      nextResetAt: state.nextResetAt,
      dailyAllowance: config.dailyFreeCredits,
    };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const now = Date.now();
    const state = computeBuckets(snap.data(), config, now);
    const total = state.earned + state.daily;
    if (total < amount) {
      throw new InsufficientCreditsError(total);
    }
    // Spend daily first, keeping earned credits safe.
    const fromDaily = Math.min(state.daily, amount);
    const fromEarned = amount - fromDaily;
    const next: BucketState = {
      earned: state.earned - fromEarned,
      daily: state.daily - fromDaily,
      nextResetAt: state.nextResetAt,
      resetDue: false,
    };
    writeBuckets(tx, userRef, uid, next);
    writeLedgerEntry(tx, uid, -amount, reason, next.earned + next.daily, refId);
    return {
      total: next.earned + next.daily,
      earned: next.earned,
      daily: next.daily,
      nextResetAt: next.nextResetAt,
      dailyAllowance: config.dailyFreeCredits,
    };
  });
}