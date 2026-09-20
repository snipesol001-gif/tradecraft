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
      "radial-gradient(ellipse 70% 60% at 15% -10%, rgba(168, 148, 255, 0.55), transparent 60%), radial-gradient(ellipse 60% 55% at 95% 25%, rgba(90, 220, 208, 0.4), transparent 62%), radial-gradient(ellipse 70% 55% at 45% 120%, rgba(233, 128, 196, 0.42), transparent 64%), linear-gradient(165deg, #2a1c52 0%, #150d33 65%, #0e0926 100%)",
  },
  {
    id: "twilight-ember",
    label: "Twilight Ember",
    tier: "premium_plus",
    base: "dark",
    previewGradient:
      "radial-gradient(ellipse 90% 65% at 50% 125%, rgba(232, 92, 56, 0.55), transparent 70%), radial-gradient(ellipse 55% 45% at 88% -8%, rgba(214, 70, 90, 0.32), transparent 65%), linear-gradient(172deg, #3d1220 0%, #1d0a14 68%, #120710 100%)",
  },
  {
    id: "abyssal-blue",
    label: "Abyssal Blue",
    tier: "premium_plus",
    base: "dark",
    previewGradient:
      "radial-gradient(ellipse 90% 60% at 50% -12%, rgba(60, 190, 220, 0.48), transparent 64%), radial-gradient(ellipse 70% 55% at 5% 115%, rgba(10, 90, 120, 0.42), transparent 70%), linear-gradient(175deg, #0a2438 0%, #041222 62%, #020b16 100%)",
  },
  {
    id: "sakura-drift",
    label: "Sakura Drift",
    tier: "premium_plus",
    base: "light",
    previewGradient:
      "radial-gradient(ellipse 70% 60% at 8% -12%, rgba(228, 208, 248, 0.8), transparent 62%), radial-gradient(ellipse 80% 60% at 95% 115%, rgba(248, 205, 222, 0.7), transparent 68%), linear-gradient(168deg, #fdf7fa 0%, #faeef3 55%, #f7ecf2 100%)",
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