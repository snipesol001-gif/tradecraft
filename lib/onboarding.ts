// Onboarding field rules, shared by the API routes and (in Part 2b) the
// wizard forms, so client and server always validate identically.

import { COUNTRIES } from "./countries";
import { SERVICES } from "./services";

export type ExperienceLevel = "beginner" | "intermediate" | "expert";

export const SERVICE_IDS = new Set(SERVICES.map((s) => s.id));

export const MAX_SERVICES = 8;
export const MAX_URL_LENGTH = 200;

export function validateDisplayName(v: unknown): string | null {
  if (typeof v !== "string") return "Display name is required.";
  const t = v.trim();
  if (t.length < 2 || t.length > 50) return "Display name must be 2 to 50 characters.";
  return null;
}

export function validateProfessionalTitle(v: unknown): string | null {
  if (typeof v !== "string") return "Professional title is required.";
  const t = v.trim();
  if (t.length < 2 || t.length > 60) return "Professional title must be 2 to 60 characters.";
  return null;
}

export function validateCountry(v: unknown): string | null {
  if (typeof v !== "string" || !COUNTRIES.includes(v)) return "Select your country.";
  return null;
}

export function validateTimezone(v: unknown): string | null {
  if (typeof v !== "string" || v.trim().length < 2 || v.trim().length > 64) {
    return "Select your timezone.";
  }
  return null;
}

export function validateServices(v: unknown): string | null {
  if (!Array.isArray(v) || v.length < 1) return "Select at least one service.";
  if (v.length > MAX_SERVICES) return `Select up to ${MAX_SERVICES} services.`;
  for (const id of v) {
    if (typeof id !== "string" || !SERVICE_IDS.has(id)) return "Unknown service selected.";
  }
  return null;
}

export function validateExperienceLevel(v: unknown): string | null {
  if (v !== "beginner" && v !== "intermediate" && v !== "expert") {
    return "Select your experience level.";
  }
  return null;
}

export function validateYearsExperience(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null; // optional
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 60) {
    return "Years of experience must be a whole number from 0 to 60.";
  }
  return null;
}

export function validateOptionalUrl(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null; // optional
  if (typeof v !== "string") return "Invalid URL.";
  const t = v.trim();
  if (t.length > MAX_URL_LENGTH) return "URL is too long.";
  let parsed: URL;
  try {
    parsed = new URL(t);
  } catch {
    return "Enter a full URL, starting with https://";
  }
  if (parsed.protocol !== "https:") return "URL must start with https://";
  return null;
}

// Which fields belong to which step, and how each is validated.
// Steps are 1 to 6. Step 7 is the review screen and saves nothing.
export const STEP_VALIDATORS: Record<
  number,
  Array<[field: string, validate: (v: unknown) => string | null]>
> = {
  1: [["displayName", validateDisplayName]],
  2: [["professionalTitle", validateProfessionalTitle]],
  3: [["country", validateCountry], ["timezone", validateTimezone]],
  4: [["services", validateServices]],
  5: [
    ["experienceLevel", validateExperienceLevel],
    ["yearsExperience", validateYearsExperience],
  ],
  6: [["portfolioUrl", validateOptionalUrl], ["websiteUrl", validateOptionalUrl]],
};

export const TOTAL_STEPS = 7;