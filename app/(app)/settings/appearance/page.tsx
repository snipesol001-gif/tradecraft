"use client";

// Appearance settings: theme preference, persisted locally (instant) and
// to the account (so it follows the user across devices when they sign
// in elsewhere).

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function AppearancePage() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc-theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        setChoice(stored);
      }
    } catch {
      // Unavailable storage: default.
    }
  }, []);

  function apply(theme: ThemeChoice) {
    setChoice(theme);
    try {
      localStorage.setItem("tc-theme", theme);
    } catch {
      // Non-fatal.
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }

  async function saveToAccount() {
    setSaving(true);
    try {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch: { theme: choice } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Silent: local preference already applies.
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
          Choose how TradeCraft looks on this device, and save the choice to
          your account.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => apply(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-colors",
                  choice === opt.value
                    ? "border-text-primary bg-sunken"
                    : "border-border bg-surface hover:border-border-strong"
                )}
              >
                <opt.icon size={20} className="text-text-primary" />
                <span className="text-sm font-medium text-text-primary">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveToAccount} disabled={saving}>
              {saving ? "Saving..." : "Save to my account"}
            </Button>
            {saved && (
              <span className="text-sm font-medium text-success">Saved</span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}