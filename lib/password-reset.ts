// Password reset flow rules. The values deliberately mirror the email
// verification rules so both flows behave the same. The cryptographic
// primitives are reused directly from lib/verification.

export const PASSWORD_RESET_RULES = {
  CODE_TTL_MINUTES: 15,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  DAILY_SEND_LIMIT: 5,
  LOCKOUT_MINUTES: 15,
  MAX_INVALIDATIONS_PER_DAY: 3,
};