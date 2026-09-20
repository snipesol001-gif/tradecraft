"use client";

// Appearance: the theme gallery. Swatches show each theme's real
// atmosphere. Clicking previews the theme live; saving requires the
// tier that owns it, verified server-side.

import { useEffect, useState } from "react";
import { Check, Crown, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { THEMES, getTheme, isThemeAllowed } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type TierState = { premium: boolean; premiumPlus: boolean; loaded: boolean };

export default function AppearancePage() {
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [tier, setTier] = useState<TierState>({
    premium: false,
    premiumPlus: false,
    loaded: false,
  });
  const [accountTheme, setAccountTheme] = useState<string | null>(null);
  const [selection, setSelection] = useState<string>("system");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/theme");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && typeof data.theme === "string") {
          setAccountTheme(data.theme);
          setSelection(data.theme);
        }
      } catch {
        // Account fetch failure leaves local selection.
      }
      try {
        const res = await fetch("/api/premium/status");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setTier({
            premium: data.premium === true,
            premiumPlus: data.premiumPlus === true,
            loaded: true,
          });
        }
      } finally {
        setTier((t) => ({ ...t, loaded: true }));
      }
    })();
  }, []);

  const activeDef = getTheme(selection);

  function previewTheme(id: string) {
    const theme = getTheme(id);
    if (!theme) return;
    setSelection(id);
    // Live preview: applies immediately. Saving is the entitlement gate.
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved =
      theme.id === "system"
        ? { dark: prefersDark, dataTheme: null }
        : { dark: theme.base === "dark", dataTheme: theme.id };
    document.documentElement.classList.toggle("dark", resolved.dark);
    if (resolved.dataTheme) {
      document.documentElement.setAttribute("data-theme", resolved.dataTheme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  async function saveTheme() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: selection }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setTheme(selection);
        setAccountTheme(selection);
        toast({ title: "Theme saved", variant: "success" });
      } else if (data?.error === "UPGRADE_REQUIRED") {
        const t = getTheme(selection);
        toast({
          title: `${t?.label ?? "That theme"} needs ${t?.tier === "premium" ? "Premium" : "Premium+"}`,
          description: "Explore Premium to unlock it.",
          variant: "error",
        });
      } else {
        toast({ title: "Could not save the theme", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedTier = getTheme(selection)?.tier;
  const selectionNeedsUpgrade =
    selection !== "system" &&
    !isThemeAllowed(selection, { premium: tier.premium, premiumPlus: tier.premiumPlus });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Appearance</h1>
        <p className="mt-1 text-sm text-text-muted">
          Preview any theme live. Saving requires the tier that owns it.
        </p>
      </div>

      {!tier.loaded ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const allowed = isThemeAllowed(t.id, {
              premium: tier.premium,
              premiumPlus: tier.premiumPlus,
            });
            const isAccount = accountTheme === t.id;
            const isSelected = selection === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => previewTheme(t.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-2 text-left transition-all duration-150",
                  isSelected
                    ? "border-text-primary ring-2 ring-text-primary/30"
                    : "border-border hover:border-border-strong"
                )}
              >
                {/* Gradient swatch: the theme's real atmosphere */}
                <div
                  className="relative flex h-24 items-end overflow-hidden rounded-lg"
                  style={{ background: t.previewGradient }}
                >
                  {/* Miniature content panel, like the real app */}
                  <div className="mb-2 ml-2 h-10 w-2/5 rounded-md border border-white/10 bg-black/35 p-1.5">
                    <div className="mb-1 h-1.5 w-3/4 rounded-full bg-white/50" />
                    <div className="h-1.5 w-1/2 rounded-full bg-white/25" />
                  </div>
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                  {!allowed && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      {t.tier === "premium" ? <Crown size={10} /> : <Lock size={10} />}
                      {t.tier === "premium" ? "Premium" : "Premium+"}
                    </span>
                  )}
                  {isAccount && !isSelected && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      Saved
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-1 pb-1 pt-2.5">
                  <span className="text-sm font-medium text-text-primary">{t.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={saveTheme} disabled={saving || !tier.loaded} loading={saving}>
          {saving ? "Saving..." : "Save theme to my account"}
        </Button>
        <Button variant="ghost" onClick={() => previewTheme("system")} disabled={saving}>
          <RotateCcw size={14} />
          Reset preview
        </Button>
      </div>

      {selectionNeedsUpgrade && (
        <Card className="border-text-primary/30 p-4">
          <p className="text-sm font-medium text-text-primary">
            {activeDef?.label} is a {selectedTier === "premium" ? "Premium" : "Premium+"} theme
          </p>
          <p className="mt-1 text-sm text-text-muted">
            You are previewing it live. Explore Premium to save and keep it.
          </p>
          <Link href="/premium" className="mt-3 inline-block">
            <Button size="sm">
              <Crown size={14} />
              Explore Premium
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}