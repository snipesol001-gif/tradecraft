"use client";

// The theme system. Themes are ids from lib/themes.ts: free modes
// (light, dark, system) plus named premium looks. Application is two
// layers: the .dark class per the theme's base mode, and a data-theme
// attribute carrying the look's CSS overrides. The choice persists in
// localStorage (applied pre-paint by the layout script) and can be
// saved to the account from the appearance page.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { resolveTheme } from "@/lib/themes";

export type Theme = string; // a theme id from lib/themes.ts

const STORAGE_KEY = "tc-theme";
const DEFAULT_THEME = "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedDark: boolean;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): boolean {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(theme, prefersDark);
  document.documentElement.classList.toggle("dark", resolved.dark);
  if (resolved.dataTheme) {
    document.documentElement.setAttribute("data-theme", resolved.dataTheme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  return resolved.dark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [resolvedDark, setResolvedDark] = useState(false);

  useEffect(() => {
    let initial: Theme = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initial = stored;
    } catch {
      // Storage unavailable: default.
    }
    setThemeState(initial);
    setResolvedDark(applyTheme(initial));
  }, []);

  // Follow OS changes only while on the system theme.
  useEffect(() => {
    if (theme !== DEFAULT_THEME) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedDark(applyTheme(theme));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Non-fatal: applies for this session regardless.
    }
    setResolvedDark(applyTheme(t));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}