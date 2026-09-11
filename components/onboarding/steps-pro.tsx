"use client";

// Onboarding steps 4 to 7: services, experience, optional links, review.

import { SERVICES, SERVICE_GROUPS } from "@/lib/services";
import { MAX_SERVICES, type ExperienceLevel } from "@/lib/onboarding";

export function StepServices({
  selected,
  setSelected,
}: {
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < MAX_SERVICES) {
      setSelected([...selected, id]);
    }
  }

  return (
    <div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {selected.length} of {MAX_SERVICES} selected
      </p>
      <div className="mt-3 space-y-5">
        {SERVICE_GROUPS.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {group}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SERVICES.filter((s) => s.group === group).map((s) => {
                const checked = selected.includes(s.id);
                const disabled = !checked && selected.length >= MAX_SERVICES;
                const base =
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm";
                const cls = checked
                  ? base + " border-neutral-900 dark:border-white"
                  : disabled
                    ? base + " border-neutral-200 dark:border-neutral-800 opacity-40 cursor-not-allowed"
                    : base + " border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600";
                return (
                  <label key={s.id} className={cls}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(s.id)}
                      className="accent-neutral-900 dark:accent-white"
                    />
                    {s.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LEVELS: Array<{ value: ExperienceLevel; label: string; hint: string }> = [
  { value: "beginner", label: "Beginner", hint: "Just getting started" },
  { value: "intermediate", label: "Intermediate", hint: "A few clients under my belt" },
  { value: "expert", label: "Expert", hint: "Years of professional work" },
];

export function StepExperience({
  level,
  setLevel,
  years,
  setYears,
}: {
  level: string;
  setLevel: (v: ExperienceLevel) => void;
  years: string;
  setYears: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {LEVELS.map((l) => {
          const checked = level === l.value;
          const base = "flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer";
          const cls = checked
            ? base + " border-neutral-900 dark:border-white"
            : base + " border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600";
          return (
            <label key={l.value} className={cls}>
              <input
                type="radio"
                name="experience"
                checked={checked}
                onChange={() => setLevel(l.value)}
                className="mt-0.5 accent-neutral-900 dark:accent-white"
              />
              <span>
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-neutral-500">{l.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div>
        <label htmlFor="years" className="block text-sm font-medium mb-1">
          Years of experience (optional)
        </label>
        <input
          id="years"
          type="number"
          min={0}
          max={60}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="e.g. 3"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-faint transition-colors duration-150 focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ring/25"
        />
      </div>
    </div>
  );
}

export function StepLinks({
  portfolioUrl,
  setPortfolioUrl,
  websiteUrl,
  setWebsiteUrl,
}: {
  portfolioUrl: string;
  setPortfolioUrl: (v: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (v: string) => void;
}) {
  const inputClass =
    "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600";
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="portfolio" className="block text-sm font-medium mb-1">
          Portfolio URL (optional)
        </label>
        <input
          id="portfolio"
          type="url"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder="https://your-portfolio.com"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="website" className="block text-sm font-medium mb-1">
          Personal website (optional)
        </label>
        <input
          id="website"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://your-site.com"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-neutral-500">
        Both must be full URLs starting with https:// You can add or change
        these later from your profile.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
      <span className="text-sm text-neutral-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-all">
        {value || "-"}
      </span>
    </div>
  );
}

export function StepReview({
  username,
  displayName,
  professionalTitle,
  country,
  timezone,
  services,
  experienceLevel,
  yearsExperience,
  portfolioUrl,
  websiteUrl,
}: {
  username: string | null;
  displayName: string;
  professionalTitle: string;
  country: string;
  timezone: string;
  services: string[];
  experienceLevel: string;
  yearsExperience: string;
  portfolioUrl: string;
  websiteUrl: string;
}) {
  const serviceLabels = services
    .map((id) => SERVICES.find((s) => s.id === id)?.label ?? id)
    .join(", ");
  const levelLabel = experienceLevel
    ? experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)
    : "";
  const experienceText = [
    levelLabel,
    yearsExperience ? yearsExperience + " yrs" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-2">
      <Row label="Username" value={username ? "@" + username : ""} />
      <Row label="Display name" value={displayName} />
      <Row label="Title" value={professionalTitle} />
      <Row label="Country" value={country} />
      <Row label="Timezone" value={timezone} />
      <Row label="Services" value={serviceLabels} />
      <Row label="Experience" value={experienceText} />
      <Row label="Portfolio" value={portfolioUrl} />
      <Row label="Website" value={websiteUrl} />
    </div>
  );
}