"use client";

// Appearance: the theme gallery. Free themes apply instantly; premium
// themes preview on selection but require entitlement to save (server-
// verified). The account theme is fetched and highlighted on load.

import { useEffect, useState } from "react";
import { Check, Crown, Lock, RotateCcw } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEMES, getTheme, isThemeAllowed } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type TierState = { premium: boolean; premiumPlus: boolean; loaded: boolean };

export default function AppearancePage() {
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [tier, setTier] = useState<TierState>({ premium: false, premiumPlus: false, loaded: false });
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
      // Entitlement from the session context source of truth.
      try {
        const res = await fetch("/api/premium/status");
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setTier({ premium: data.premium === true, premiumPlus: data.premiumPlus === true, loaded: true });
        }
      } finally {
        setTier((t) => ({ ...t, loaded: true }));
      }
    })();
  }, []);

  const activeId = selection;
  const activeDef = getTheme(activeId);

  function previewTheme(id: string) {
    const theme = getTheme(id);
    if (!theme) return;
    // Previews apply visually for any theme; saving is what requires
    // entitlement. If the user navigates away without saving, the
    // pre-paint script restores the saved theme on next load.
    setSelection(id);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme.id === "system"
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

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Appearance</h1>
        <p className="mt-1 text-sm text-text-muted">
          Preview any theme. Saving requires the tier that owns it.
        </p>
      </div>

      {!tier.loaded ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const allowed = isThemeAllowed(t.id, { premium: tier.premium, premiumPlus: tier.premiumPlus });
            const isAccount = accountTheme === t.id;
            const isSelected = selection === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => previewTheme(t.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-text-primary"
                    : "border-border hover:border-border-strong"
                )}
              >
                {/* Preview swatch */}
                <div
                  className="flex h-20 items-end rounded-lg border p-2"
                  style={{ background: t.preview.bg }}
                >
                  <div
                    className="h-full w-1/3 rounded-md border p-1.5"
                    style={{ background: t.preview.surface }}
                  >
                    <div
                      className="mb-1 h-1.5 w-3/4 rounded-full"
                      style={{ background: t.preview.text, opacity: 0.6 }}
                    />
                    <div
                      className="h-1.5 w-1/2 rounded-full"
                      style={{ background: t.preview.text, opacity: 0.25 }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">{t.label}</span>
                  {isAccount && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                      <Check size={10} />
                      Saved
                    </span>
                  )}
                  {!allowed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      {t.tier === "premium" ? <Crown size={10} /> : <Lock size={10} />}
                      {t.tier === "premium" ? "Premium" : "Premium+"}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-text-primary text-background">
                    <Check size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={saveTheme} disabled={saving || !tier.loaded} loading={saving}>
          {saving ? "Saving..." : "Save theme to my account"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => previewTheme("system")}
          disabled={saving}
        >
          <RotateCcw size={14} />
          Reset preview
        </Button>
      </div>

      {selection !== "system" && getTheme(selection)?.tier !== "free" && (
        <p className="text-xs text-text-faint">
          Previewing "{getTheme(selection)?.label}". Save to keep it, or reset
          the preview to return to your saved theme.
        </p>
      )}
    </div>
  );
}