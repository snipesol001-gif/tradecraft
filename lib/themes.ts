// The TradeCraft theme registry. Single source of truth for theme ids,
// labels, tiers, base modes, and preview gradients. The pre-paint script
// in app/layout.tsx mirrors the id-to-base map (it cannot import
// TypeScript). Adding a theme: one entry here, one CSS block in
// globals.css keyed by data-theme, one script map line. Entitlement and
// persistence architecture never change.

export type ThemeTier = "free" | "premium" | "premium_plus";

export type ThemeDef = {
  id: string;
  label: string;
  tier: ThemeTier;
  base: "light" | "dark";
  // Miniature of the theme's real atmosphere, used by the gallery swatch.
  previewGradient: string;
};

export const FREE_FALLBACK_THEME = "system";

export const THEMES: ThemeDef[] = [
  {
    id: "light",
    label: "Light",
    tier: "free",
    base: "light",
    previewGradient: "linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%)",
  },
  {
    id: "dark",
    label: "Dark",
    tier: "free",
    base: "dark",
    previewGradient: "linear-gradient(180deg, #1c1c1f 0%, #09090b 100%)",
  },
  {
    id: "system",
    label: "Automatic",
    tier: "free",
    base: "dark",
    previewGradient:
      "linear-gradient(135deg, #f4f4f5 0%, #f4f4f5 48%, #18181b 52%, #09090b 100%)",
  },
  {
    id: "midnight",
    label: "Midnight",
    tier: "free",
    base: "dark",
    previewGradient: "linear-gradient(180deg, #131a2c 0%, #060913 100%)",
  },
  {
    id: "indigo-drift",
    label: "Indigo Drift",
    tier: "premium",
    base: "dark",
    previewGradient:
      "radial-gradient(ellipse 90% 70% at 20% -10%, rgba(150, 132, 255, 0.65), transparent 60%), radial-gradient(ellipse 70% 60% at 55% 115%, rgba(80, 50, 210, 0.5), transparent 68%), linear-gradient(168deg, #3b2a9e 0%, #241873 35%, #150e45 68%, #0a0626 100%)",
  },
  {
    id: "golden-horizon",
    label: "Golden Horizon",
    tier: "premium",
    base: "dark",
    previewGradient:
      "radial-gradient(ellipse 100% 70% at 50% 120%, rgba(255, 184, 74, 0.6), transparent 72%), radial-gradient(ellipse 60% 50% at 80% -10%, rgba(255, 204, 112, 0.35), transparent 65%), linear-gradient(170deg, #2a1f0a 0%, #17110a 65%, #0f0b05 100%)",
  },
  {
    id: "prism-glow",
    label: "Prism Glow",
    tier: "premium_plus",
    base: "dark",
    previewGradient:
      "linear-gradient(105deg, #1a1147 0%, #3d1866 26%, #6e2a5e 52%, #274369 78%, #0d1b33 100%)",
  },
  {
    id: "twilight-ember",
    label: "Twilight Ember",
    tier: "premium_plus",
    base: "dark",
    previewGradient:
      "linear-gradient(215deg, #4a1230 0%, #7a1e30 30%, #a83a1e 55%, #3a140c 82%, #140a08 100%)",
  },
  {
    id: "abyssal-blue",
    label: "Abyssal Blue",
    tier: "premium_plus",
    base: "dark",
    previewGradient:
      "linear-gradient(135deg, #0e3a5e 0%, #0d4a70 28%, #0a5a6e 52%, #063647 76%, #02101c 100%)",
  },
  {
    id: "sakura-drift",
    label: "Sakura Drift",
    tier: "premium_plus",
    base: "light",
    previewGradient:
      "linear-gradient(20deg, #ede4f7 0%, #f9e8f0 35%, #ffffff 60%, #fdf2f6 100%)",
  },
];

export function getTheme(id: string): ThemeDef | null {
  return THEMES.find((t) => t.id === id) ?? null;
}

export function themeTier(id: string): ThemeTier {
  return getTheme(id)?.tier ?? "free";
}

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