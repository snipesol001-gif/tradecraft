"use client";

// Profile editing form. Reuses the onboarding services and experience
// editors, and validates through the same server-side rules. The username
// is not editable here, matching the API.

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { StepServices, StepExperience } from "@/components/onboarding/steps-pro";
import type { ExperienceLevel } from "@/lib/onboarding";

type ProfileFormProps = {
  initial: {
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
};

const inputClass =
  "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export default function ProfileForm({ initial }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [professionalTitle, setProfessionalTitle] = useState(initial.professionalTitle);
  const [country, setCountry] = useState(initial.country);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [services, setServices] = useState<string[]>(initial.services);
  const [experienceLevel, setExperienceLevel] = useState(initial.experienceLevel);
  const [yearsExperience, setYearsExperience] = useState(initial.yearsExperience);
  const [portfolioUrl, setPortfolioUrl] = useState(initial.portfolioUrl);
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl);

  const [status, setStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setStatus("SAVING");
    setError(null);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patch: {
            displayName,
            professionalTitle,
            country,
            timezone,
            services,
            experienceLevel,
            yearsExperience,
            portfolioUrl: portfolioUrl.trim(),
            websiteUrl: websiteUrl.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStatus("SAVED");
        setTimeout(() => setStatus("IDLE"), 3000);
        return;
      }
      setError(data?.message ?? "Could not save. Please try again.");
      setStatus("ERROR");
    } catch {
      setError("Could not save. Please try again.");
      setStatus("ERROR");
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name">
          <input
            type="text"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Professional title">
          <input
            type="text"
            maxLength={60}
            value={professionalTitle}
            onChange={(e) => setProfessionalTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Country">
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
        </Field>
        <Field label="Timezone">
          <input
            type="text"
            maxLength={64}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Services</p>
        <StepServices selected={services} setSelected={setServices} />
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
        <Field label="Portfolio URL" hint="Full URL starting with https://">
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://your-portfolio.com"
            className={inputClass}
          />
        </Field>
        <Field label="Personal website" hint="Full URL starting with https://">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://your-site.com"
            className={inputClass}
          />
        </Field>
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
          className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {status === "SAVING" ? "Saving..." : "Save changes"}
        </button>
        {status === "SAVED" && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Profile saved
          </span>
        )}
      </div>
    </div>
  );
}