// The credit engine. Balances exist only server-side. Every change goes
// through grantCredits or spendCredits, which run inside Firestore
// transactions so simultaneous operations can never corrupt a balance.
// Every change also appends a ledger entry recording the balance after the
// change, so any account's history can be reconstructed exactly.
//
// Daily allowance (lazy reset): the user document stores creditNextResetAt.
// The first credit operation that notices the timestamp has passed performs
// the reset inline, capped at one reset per pass: a user away for three
// days returns to exactly one fresh allowance. No rollover.
//
// applyGrantInTx exposes the grant for callers that are already inside
// their own transaction (the referral resolver), so a status flip and its
// credit grants commit together atomically. It must only be used inside
// db.runTransaction.
//
// Storage note: balances are flat top-level fields (creditBalance,
// creditNextResetAt), not a nested map. set() with merge:true replaces a
// whole nested map, which would let a concurrent grant clobber a
// concurrent spend. Flat fields merge per field, so concurrency is safe.

import { FieldValue, getFirestore, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { getAdminApp } from "./firebase-admin";

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
};

export type CreditState = {
  balance: number;
  nextResetAt: number;
  dailyAllowance: number;
};

export class InsufficientCreditsError extends Error {
  constructor(public balance: number) {
    super("INSUFFICIENT_CREDITS");
  }
}

// Config changes rarely but is read often. Cache it in memory for one
// minute per server instance to save Firestore reads. Editing the config
// document takes effect within a minute, no deploy needed.
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
  };
  if (value.resetHourUtc > 23) {
    throw new Error('config/credits field "resetHourUtc" must be 0 to 23.');
  }
  configCache = { value, expiresAt: Date.now() + CONFIG_TTL_MS };
  return value;
}

// The next occurrence of resetHourUtc, strictly after nowMs. Pure UTC math,
// so there is one global refill moment regardless of local timezones.
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

function writeLedgerEntry(
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

// Shared transaction body: loads the balance and applies the lazy daily
// reset if it is due. Returns the up-to-date balance and next reset time.
async function loadAndReset(
  tx: Transaction,
  uid: string,
  userRef: DocumentReference,
  config: CreditsConfig
): Promise<{ balance: number; nextResetAt: number }> {
  const snap = await tx.get(userRef);
  const d = snap.data() ?? {};
  const now = Date.now();
  let balance = typeof d.creditBalance === "number" ? d.creditBalance : null;
  let nextResetAt = typeof d.creditNextResetAt === "number" ? d.creditNextResetAt : null;

  if (balance === null || nextResetAt === null || nextResetAt <= now) {
    balance = config.dailyFreeCredits;
    nextResetAt = computeNextResetAt(config.resetHourUtc, now);
    tx.set(
      userRef,
      {
        creditBalance: balance,
        creditNextResetAt: nextResetAt,
        creditLastResetAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    writeLedgerEntry(tx, uid, balance, "daily_allocation", balance);
  }

  return { balance, nextResetAt };
}

// Grant inside a caller's transaction. Applies the lazy reset if due,
// adds the amount, and writes the ledger entry. Returns the balance after.
export async function applyGrantInTx(
  tx: Transaction,
  uid: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
  actorUid?: string
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("applyGrantInTx requires a positive integer amount.");
  }
  const config = await getCreditsConfig();
  const userRef = getFirestore(getAdminApp()).collection("users").doc(uid);
  const before = await loadAndReset(tx, uid, userRef, config);
  const balanceAfter = before.balance + amount;
  tx.set(
    userRef,
    { creditBalance: balanceAfter, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  writeLedgerEntry(tx, uid, amount, reason, balanceAfter, refId, actorUid);
  return balanceAfter;
}

export async function getCreditState(uid: string): Promise<CreditState> {
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const state = await loadAndReset(tx, uid, userRef, config);
    return {
      balance: state.balance,
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
  const config = await getCreditsConfig();
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const before = await loadAndReset(tx, uid, userRef, config);
    const balanceAfter = before.balance + amount;
    tx.set(
      userRef,
      { creditBalance: balanceAfter, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    writeLedgerEntry(tx, uid, amount, reason, balanceAfter, refId, actorUid);
    return {
      balance: balanceAfter,
      nextResetAt: before.nextResetAt,
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
  return db.runTransaction(async (tx) => {
    const before = await loadAndReset(tx, uid, userRef, config);
    if (before.balance < amount) {
      throw new InsufficientCreditsError(before.balance);
    }
    const balanceAfter = before.balance - amount;
    tx.set(
      userRef,
      { creditBalance: balanceAfter, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    writeLedgerEntry(tx, uid, -amount, reason, balanceAfter, refId);
    return {
      balance: balanceAfter,
      nextResetAt: before.nextResetAt,
      dailyAllowance: config.dailyFreeCredits,
    };
  });
}