// Username rules, shared by client and server so both sides always agree.

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,19}$/;

export const RESERVED_USERNAMES = [
  "admin", "administrator", "support", "help", "api", "root",
  "trade", "tradecraft", "official", "team", "security",
  "billing", "payments", "moderator", "owner", "null", "undefined",
];

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export function usernameError(username: string): string | null {
  if (!username) return "Choose a username.";
  if (username.length < USERNAME_MIN) return "Too short. At least 3 characters.";
  if (username.length > USERNAME_MAX) return "Too long. 20 characters maximum.";
  if (!USERNAME_PATTERN.test(username)) {
    return "Use lowercase letters, numbers, and underscores only. Must not start with an underscore.";
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return "That username is reserved.";
  }
  return null;
}