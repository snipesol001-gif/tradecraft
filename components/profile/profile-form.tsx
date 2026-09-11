"use client";

// Profile page form, read-only by default. Summary rows render from a
// "saved" snapshot that updates the moment a save succeeds, so changes
// appear immediately without a page refresh. Two independent edit modes
// (profile details, services), each with its own save and cancel buttons
// that exist only while editing. Validation uses the same server-side
// rules as onboarding. Portfolio and website links render clickable when
// present, and as "-" when empty.

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { SERVICES } from "@/lib/services";
import { StepServices, StepExperience } from "@/components/onboarding/steps-pro";
import type { ExperienceLevel } from "@/lib/onboarding";

type ProfileData = {
  displayName: string;
  professionalTitle: string;
  country: string;
  timezone: string;
  services: string[];
  experienceLevel: string;
  yearsExperience: string;
  portfolioUrl: string;
  websiteUrl: string;
};

type ProfileFormProps = {
  initial: ProfileData;
};

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint transition-colors duration-150 focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ring/25";

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-neutral-500 shrink-0">{label}</span>
      {href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-right break-all underline underline-offset-4"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium text-right break-all">
          {value || "-"}
        </span>
      )}
    </div>
  );
}

function serviceLabel(id: string): string {
  return SERVICES.find((s) => s.id === id)?.label ?? id;
}

function levelLabel(level: string): string {
  return level ? level.charAt(0).toUpperCase() + level.slice(1) : "";
}

export default function ProfileForm({ initial }: ProfileFormProps) {
  // "saved" mirrors what the server has accepted. Summary rows read from
  // it, and it updates the instant a save succeeds. That is what makes
  // the page reflect changes immediately instead of after a refresh.
  const [saved, setSaved] = useState<ProfileData>(initial);

  // Live edit state. Initialized from initial, reverted from saved on
  // cancel, and written into saved on a successful save.
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [professionalTitle, setProfessionalTitle] = useState(initial.professionalTitle);
  const [country, setCountry] = useState(initial.country);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [services, setServices] = useState<string[]>(initial.services);
  const [experienceLevel, setExperienceLevel] = useState(initial.experienceLevel);
  const [yearsExperience, setYearsExperience] = useState(initial.yearsExperience);
  const [portfolioUrl, setPortfolioUrl] = useState(initial.portfolioUrl);
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);

  const [editing, setEditing] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [error, setError] = useState<string | null>(null);

  async function savePatch(patch: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStatus("SAVED");
        setTimeout(() => setStatus("IDLE"), 3000);
        return true;
      }
      setError(data?.message ?? "Could not save. Please try again.");
      setStatus("ERROR");
      return false;
    } catch {
      setError("Could not save. Please try again.");
      setStatus("ERROR");
      return false;
    }
  }

  async function handleSave() {
    setStatus("SAVING");
    setError(null);
    const patch = {
      displayName,
      professionalTitle,
      country,
      timezone,
      experienceLevel,
      yearsExperience,
      portfolioUrl: portfolioUrl.trim(),
      websiteUrl: websiteUrl.trim(),
    };
    const ok = await savePatch(patch);
    if (ok) {
      setSaved((prev) => ({ ...prev, ...patch }));
      setEditing(false);
    }
  }

  async function handleSaveServices() {
    setStatus("SAVING");
    setError(null);
    const ok = await savePatch({ services });
    if (ok) {
      setSaved((prev) => ({ ...prev, services }));
      setEditingServices(false);
    }
  }

  function cancelEditing() {
    setDisplayName(saved.displayName);
    setProfessionalTitle(saved.professionalTitle);
    setCountry(saved.country);
    setTimezone(saved.timezone);
    setExperienceLevel(saved.experienceLevel);
    setYearsExperience(saved.yearsExperience);
    setPortfolioUrl(saved.portfolioUrl);
    setWebsiteUrl(saved.websiteUrl);
    setEditing(false);
  }

  function cancelEditingServices() {
    setServices(saved.services);
    setEditingServices(false);
  }

  const experienceText = [
    levelLabel(saved.experienceLevel),
    saved.yearsExperience ? saved.yearsExperience + " yrs" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card space-y-6">
      {editing ? (
        <>
          <p className="text-sm font-semibold">Editing profile</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Display name</label>
              <input
                type="text"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Professional title</label>
              <input
                type="text"
                maxLength={60}
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass + " dark:bg-neutral-900"}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <input
                type="text"
                maxLength={64}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Experience</p>
            <StepExperience
              level={experienceLevel}
              setLevel={(v: ExperienceLevel) => setExperienceLevel(v)}
              years={yearsExperience}
              setYears={setYearsExperience}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Portfolio URL</label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://your-portfolio.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personal website</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://your-site.com"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={status === "SAVING"}
              className="rounded-lg bg-primary text-primary-foreground font-medium px-5 py-2.5 text-sm shadow-card transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {status === "SAVING" ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={cancelEditing}
              disabled={status === "SAVING"}
              className="rounded-lg border border-border bg-surface font-medium px-5 py-2.5 text-sm text-text-primary transition-colors duration-150 hover:bg-sunken disabled:opacity-50"
            >
              Cancel
            </button>
            {status === "SAVED" && (
              <span className="text-sm font-medium text-success">
                Profile saved
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Profile details</p>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium underline underline-offset-4 text-text-muted transition-colors hover:text-text-primary"
            >
              Edit profile
            </button>
          </div>
          <div>
            <Row label="Display name" value={saved.displayName} />
            <Row label="Professional title" value={saved.professionalTitle} />
            <Row label="Country" value={saved.country} />
            <Row label="Timezone" value={saved.timezone} />
            <Row label="Experience" value={experienceText} />
            <Row
              label="Portfolio"
              value={saved.portfolioUrl}
              href={saved.portfolioUrl || undefined}
            />
            <Row
              label="Website"
              value={saved.websiteUrl}
              href={saved.websiteUrl || undefined}
            />
          </div>
        </>
      )}

      <div className="border-t border-neutral-100 dark:border-neutral-900 pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Services</p>
          {!editingServices && (
            <button
              onClick={() => setEditingServices(true)}
              className="text-xs font-medium underline underline-offset-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Edit services
            </button>
          )}
        </div>

        {editingServices ? (
          <div>
            <StepServices selected={services} setSelected={setServices} />
            {error && (
              <p className="mt-3 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSaveServices}
                disabled={status === "SAVING"}
                className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {status === "SAVING" ? "Saving..." : "Save services"}
              </button>
              <button
                onClick={cancelEditingServices}
                disabled={status === "SAVING"}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 font-medium px-5 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : saved.services.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No services selected yet. Click "Edit services" to choose what you offer.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {saved.services.map((id) => (
              <span
                key={id}
                className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-medium"
              >
                {serviceLabel(id)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}