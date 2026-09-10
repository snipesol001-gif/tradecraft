"use client";

// Onboarding steps 1 to 3: identity (username plus display name),
// professional title, and location (country plus timezone).

import UsernameField from "./username-field";
import { COUNTRIES } from "@/lib/countries";

const inputClass =
  "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600";

export function StepIdentity({
  email,
  existingUsername,
  username,
  setUsername,
  setUsernameValid,
  displayName,
  setDisplayName,
}: {
  email: string;
  existingUsername: string | null;
  username: string;
  setUsername: (v: string) => void;
  setUsernameValid: (v: boolean) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Signing up as {email}</p>

      {existingUsername ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 px-3 py-2.5 text-sm">
          <span className="font-medium">@{existingUsername}</span>{" "}
          <span className="text-emerald-700 dark:text-emerald-400">is already claimed</span>
        </div>
      ) : (
        <UsernameField
          value={username}
          onChange={setUsername}
          onValidityChange={setUsernameValid}
        />
      )}

      <div>
        <label htmlFor="display-name" className="block text-sm font-medium mb-1">
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How should people see you?"
          className={inputClass}
        />
      </div>
    </div>
  );
}

export function StepTitle({
  professionalTitle,
  setProfessionalTitle,
}: {
  professionalTitle: string;
  setProfessionalTitle: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="title" className="block text-sm font-medium mb-1">
        Professional title
      </label>
      <input
        id="title"
        type="text"
        maxLength={60}
        value={professionalTitle}
        onChange={(e) => setProfessionalTitle(e.target.value)}
        placeholder="e.g. Freelance Web Designer"
        className={inputClass}
      />
      <p className="mt-1 text-xs text-neutral-500">
        Shown on your profile. 2 to 60 characters.
      </p>
    </div>
  );
}

export function StepLocation({
  country,
  setCountry,
  timezone,
  setTimezone,
}: {
  country: string;
  setCountry: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="country" className="block text-sm font-medium mb-1">
          Country
        </label>
        <select
          id="country"
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
        <label htmlFor="timezone" className="block text-sm font-medium mb-1">
          Timezone
        </label>
        <input
          id="timezone"
          type="text"
          maxLength={64}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="e.g. Africa/Lagos"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Detected from your device. Edit it if it is wrong.
        </p>
      </div>
    </div>
  );
}