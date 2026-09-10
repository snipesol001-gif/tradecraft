// Referral codes and capture rules.
// Phase 1 scope (per the product owner's correction): capture and storage
// hooks only. New accounts get a 'pending' referral record. The reward
// engine (verification checks, anti-abuse signals, credit grants) arrives
// in Phase 2 and is the only component allowed to turn 'pending' into
// anything else.

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { randomInt } from "crypto";
import { getAdminApp } from "./firebase-admin";

// Unambiguous alphabet: no I, L, O, 0, 1. Codes are uppercase.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{8}$/;

// A brand-new account may be attributed a referral within this window.
// Prevents retroactive attribution of old accounts. Phase 2 anti-abuse
// adds stricter signals on top (velocity, verification, IP patterns).
export const ATTRIBUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidReferralCodeFormat(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(code);
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}

// Every user gets exactly one referral code, stored twice on purpose:
// users/{uid}.referralCode for display, and referralCodes/{code} as the
// lookup that maps a code back to its owner. The transaction plus
// create() makes duplicate codes structurally impossible.
export async function ensureReferralCode(uid: string): Promise<string> {
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      return await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const existing = userSnap.data()?.referralCode;
        if (typeof existing === "string" && existing.length > 0) {
          return existing;
        }
        // create() fails if the document already exists, which is the
        // uniqueness guarantee for the code itself.
        tx.create(db.collection("referralCodes").doc(code), {
          uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.set(
          userRef,
          { referralCode: code, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        return code;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Retry only on the (astronomically unlikely) code collision.
      if (!msg.toLowerCase().includes("already exists") || attempt === 4) {
        throw err;
      }
    }
  }
  throw new Error("Could not generate a referral code.");
}