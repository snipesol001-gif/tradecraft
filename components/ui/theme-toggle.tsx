"use client";

// Cycles the free themes (light, dark, system) and renders an icon per
// mode. The appearance gallery offers the full themed set; this button
// stays a quick free-cycle control. Until mounted, renders a quiet
// placeholder so server and client markup agree.

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={cn("inline-block h-9 w-9", className)} aria-hidden />;
  }

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? "light";

  function currentIcon() {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    if (theme === "system") return Monitor;
    // Named premium themes inherit a sensible icon: Moon for dark-based
    // looks, Sun for light-based ones.
    return theme === "sakura-drift" ? Sun : Moon;
  }

  const Icon = currentIcon();

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${LABELS[theme] ?? theme}. Click for ${LABELS[next]}.`}
      aria-label={`Theme: ${LABELS[theme] ?? theme}. Switch to ${LABELS[next]}.`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors duration-150 hover:bg-sunken hover:text-text-primary",
        className
      )}
    >
      <Icon size={16} />
    </button>
  );
}