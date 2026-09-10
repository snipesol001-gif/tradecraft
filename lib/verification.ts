// Verification code engine. Generates codes, hashes them with a server-only
// secret, and compares them in constant time. The raw code is never stored.

import { createHmac, randomInt, timingSafeEqual } from "crypto";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const DAILY_SEND_LIMIT = 5;
const LOCKOUT_MINUTES = 15;
const MAX_INVALIDATIONS_PER_DAY = 3;

// Shared with the API routes so both sides use identical rules.
export const VERIFICATION_RULES = {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  DAILY_SEND_LIMIT,
  LOCKOUT_MINUTES,
  MAX_INVALIDATIONS_PER_DAY,
};

function getSecret(): string {
  const secret = process.env.VERIFICATION_CODE_SECRET;
  if (!secret) {
    throw new Error(
      "Missing VERIFICATION_CODE_SECRET. Add it to .env.local, then restart the dev server."
    );
  }
  return secret;
}

// Cryptographically secure 6-digit code, zero-padded (e.g. "004219").
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// HMAC mixes the user ID and the server secret into the hash, so one
// hashed code is only valid for the exact user it was issued to.
export function hashCode(uid: string, code: string): string {
  return createHmac("sha256", `${getSecret()}:${uid}`).update(code).digest("hex");
}

// Constant-time comparison. Same speed whether the match is at the first
// character or the last, which removes timing information from attackers.
export function codesMatch(storedHash: string, submittedHash: string): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(submittedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// UTC calendar day, used for the daily send and lockout counters.
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}