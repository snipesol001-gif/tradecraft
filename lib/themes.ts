// The TradeCraft theme registry. Single source of truth for theme ids,
// labels, tiers, and base modes. The pre-paint script in app/layout.tsx
// mirrors the id-to-base map (it cannot import TypeScript), noted in both
// places. Adding a theme later means: one entry here, one CSS block in
// globals.css keyed by data-theme, one script map line. Entitlement and
// persistence architecture never change.

export type ThemeTier = "free" | "premium" | "premium_plus";

export type ThemeDef = {
  id: string;
  label: string;
  tier: ThemeTier;
  // The base mode the theme is built on. Applying a theme toggles the
  // .dark class to match, so legacy dark: utilities behave correctly.
  base: "light" | "dark";
  // Small preview swatches for the appearance gallery.
  preview: { bg: string; surface: string; text: string };
};

export const FREE_FALLBACK_THEME = "system";

export const THEMES: ThemeDef[] = [
  // Free
  { id: "light", label: "Light", tier: "free", base: "light", preview: { bg: "#fafafa", surface: "#ffffff", text: "#0a0a0a" } },
  { id: "dark", label: "Dark", tier: "free", base: "dark", preview: { bg: "#09090b", surface: "#18181b", text: "#f4f4f5" } },
  { id: "system", label: "Automatic", tier: "free", base: "dark", preview: { bg: "#101012", surface: "#1c1c1f", text: "#ececee" } },
  { id: "midnight", label: "Midnight", tier: "free", base: "dark", preview: { bg: "#060913", surface: "#131a2c", text: "#e5e9f2" } },

  // Premium
  { id: "indigo-drift", label: "Indigo Drift", tier: "premium", base: "dark", preview: { bg: "#0a0a14", surface: "#1a1a2e", text: "#eceafd" } },
  { id: "golden-horizon", label: "Golden Horizon", tier: "premium", base: "dark", preview: { bg: "#0f0c08", surface: "#201a14", text: "#f5efe2" } },

  // Premium+
  { id: "prism-glow", label: "Prism Glow", tier: "premium_plus", base: "dark", preview: { bg: "#0d0a14", surface: "#1e1730", text: "#f0eafd" } },
  { id: "twilight-ember", label: "Twilight Ember", tier: "premium_plus", base: "dark", preview: { bg: "#120b0b", surface: "#261919", text: "#f7ecec" } },
  { id: "abyssal-blue", label: "Abyssal Blue", tier: "premium_plus", base: "dark", preview: { bg: "#04101c", surface: "#0c2236", text: "#e2f0fa" } },
  { id: "sakura-drift", label: "Sakura Drift", tier: "premium_plus", base: "light", preview: { bg: "#faf5f6", surface: "#ffffff", text: "#2b1e22" } },
];

export function getTheme(id: string): ThemeDef | null {
  return THEMES.find((t) => t.id === id) ?? null;
}

export function themeTier(id: string): ThemeTier {
  return getTheme(id)?.tier ?? "free";
}

// Entitlement check. premium_plus allows everything; premium allows
// premium and free; free allows free only.
export function isThemeAllowed(
  id: string,
  opts: { premium: boolean; premiumPlus: boolean }
): boolean {
  const theme = getTheme(id);
  if (!theme) return false;
  if (theme.tier === "free") return true;
  if (theme.tier === "premium") return opts.premium || opts.premiumPlus;
  return opts.premiumPlus;
}

// The base mode a theme id resolves to, given the OS preference for
// "system". Returns whether the .dark class should be active and which
// data-theme attribute (if any) to set on <html>.
export function resolveTheme(
  id: string,
  prefersDark: boolean
): { dark: boolean; dataTheme: string | null } {
  if (id === "system") {
    return { dark: prefersDark, dataTheme: null };
  }
  const theme = getTheme(id);
  if (!theme) {
    return { dark: prefersDark, dataTheme: null };
  }
  return { dark: theme.base === "dark", dataTheme: theme.id };
}