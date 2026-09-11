"use client";

// The onboarding orchestrator. Loads saved progress, renders the current
// step, saves each step server-side, and completes onboarding. Finishing
// shows the welcome celebration with the real daily credit amount before
// entering the dashboard. If the account already completed onboarding but
// this session predates the claim, it refreshes the session and enters
// the app directly without a celebration.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ExperienceLevel } from "@/lib/onboarding";
import StepShell from "./step-shell";
import { StepIdentity, StepTitle, StepLocation } from "./steps-basic";
import { StepServices, StepExperience, StepLinks, StepReview } from "./steps-pro";
import WelcomeCelebration from "@/components/celebration/welcome-celebration";

const TOTAL_STEPS = 7;

// Maps a completion validation field to the step that owns it, so a failed
// finish lands the user on exactly the screen that needs attention.
const FIELD_STEP: Record<string, number> = {
  username: 1,
  displayName: 1,
  professionalTitle: 2,
  country: 3,
  timezone: 3,
  services: 4,
  experienceLevel: 5,
  yearsExperience: 5,
  portfolioUrl: 6,
  websiteUrl: 6,
};

const TITLES: Record<number, { title: string; description?: string }> = {
  1: {
    title: "Who are you?",
    description: "Your username is your public handle. Your display name is what people see.",
  },
  2: { title: "What do you do?", description: "Your professional title, shown on your profile." },
  3: { title: "Where are you based?", description: "Used for timezone-aware features later." },
  4: {
    title: "What do you offer?",
    description: "Pick the services you provide, up to 8. These shape your matching later.",
  },
  5: { title: "How experienced are you?" },
  6: { title: "Your links", description: "Optional. Add them now or later from your profile." },
  7: { title: "Review", description: "Check everything, then finish." },
};

async function refreshSession(): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (idToken) {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  }
}

export default function OnboardingWizard({ email }: { email: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [dailyCredits, setDailyCredits] = useState<number | null>(null);

  const [step, setStep] = useState(1);
  const [existingUsername, setExistingUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameValid, setUsernameValid] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/state");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (data.error === "NOT_SIGNED_IN") router.replace("/login");
          else if (data.error === "EMAIL_NOT_VERIFIED") router.replace("/verify-email");
          else if (data.error === "PRIVACY_REQUIRED") router.replace("/privacy-consent");
          else setError("Could not load your progress. Refresh the page.");
          return;
        }
        if (data.status === "completed") {
          try {
            await refreshSession();
          } catch {
            // Completion already succeeded server-side. The next sign-in
            // gets a fresh cookie regardless.
          }
          router.replace("/dashboard");
          return;
        }
        const d = data.data ?? {};
        setExistingUsername(data.username);
        setDisplayName(d.displayName ?? "");
        setProfessionalTitle(d.professionalTitle ?? "");
        setCountry(d.country ?? "");
        setTimezone(d.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "");
        setServices(Array.isArray(d.services) ? d.services : []);
        setExperienceLevel(d.experienceLevel ?? "");
        setYearsExperience(d.yearsExperience === null ? "" : String(d.yearsExperience));
        setPortfolioUrl(d.portfolioUrl ?? "");
        setWebsiteUrl(d.websiteUrl ?? "");
        if (data.status === "not_started") {
          setStep(1);
        } else {
          const saved = typeof data.lastStep === "number" ? data.lastStep : 1;
          setStep(Math.min(Math.max(saved + 1, 1), TOTAL_STEPS));
        }
        setLoaded(true);
      } catch {
        if (!cancelled) setError("Could not load your progress. Refresh the page.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveStep(n: number, patch: Record<string, unknown>): Promise<boolean> {
    const res = await fetch("/api/onboarding/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: n, patch }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return true;
    if (data?.error === "VALIDATION") {
      setError(data.message ?? "Please check your answer.");
    } else if (data?.error === "ALREADY_COMPLETED") {
      router.replace("/dashboard");
    } else {
      setError("Saving failed. Please try again.");
    }
    return false;
  }

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      if (step === 1) {
        if (!existingUsername) {
          const res = await fetch("/api/username/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            setError(data?.message ?? "That username could not be claimed. Pick another.");
            return;
          }
          setExistingUsername(data.username);
        }
        if (!(await saveStep(1, { displayName }))) return;
      } else if (step === 2) {
        if (!(await saveStep(2, { professionalTitle }))) return;
      } else if (step === 3) {
        if (!(await saveStep(3, { country, timezone }))) return;
      } else if (step === 4) {
        if (!(await saveStep(4, { services }))) return;
      } else if (step === 5) {
        if (!(await saveStep(5, { experienceLevel, yearsExperience }))) return;
      } else if (step === 6) {
        if (!(await saveStep(6, { portfolioUrl, websiteUrl }))) return;
      } else if (step === 7) {
        const res = await fetch("/api/onboarding/complete", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (res.ok && (data?.ok || data?.alreadyCompleted)) {
          // Refresh the session first so the fresh cookie carries the
          // onboarding claim before we ever navigate to the dashboard.
          try {
            await refreshSession();
          } catch {
            // Completion already succeeded server-side. A fresh sign-in
            // receives a cookie with the claim regardless.
          }
          if (data?.alreadyCompleted) {
            // Re-entry edge case: no celebration, straight in.
            router.replace("/dashboard");
            router.refresh();
            return;
          }
          // First-time finish: read the credit state. This call also
          // performs the first daily allocation server-side, so the number
          // shown in the celebration is the real configured allowance.
          try {
            const cRes = await fetch("/api/credits/state");
            const cData = await cRes.json().catch(() => null);
            if (cRes.ok && cData?.ok && typeof cData.dailyAllowance === "number") {
              setDailyCredits(cData.dailyAllowance);
            }
          } catch {
            // Non-fatal: celebrate without the credits pill.
          }
          setCelebrating(true);
          return;
        }
        if (data?.error === "VALIDATION") {
          setError(data.message ?? "Something is missing.");
          setStep(FIELD_STEP[data.field] ?? 1);
          return;
        }
        setError("Could not finish onboarding. Please try again.");
        return;
      }
      setStep(step + 1);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-text-faint">Loading your progress...</p>;
  }

  const canContinue =
    step === 1
      ? displayName.trim().length >= 2 && (existingUsername !== null || usernameValid)
      : step === 2
        ? professionalTitle.trim().length >= 2
        : step === 3
          ? country !== "" && timezone.trim().length >= 2
          : step === 4
            ? services.length >= 1
            : step === 5
              ? experienceLevel !== ""
              : true;

  const meta = TITLES[step];

  return (
    <StepShell
      step={step}
      totalSteps={TOTAL_STEPS}
      title={meta.title}
      description={meta.description}
      error={error}
      continueDisabled={!canContinue}
      continueLabel={step === TOTAL_STEPS ? "Finish" : undefined}
      busyLabel={step === TOTAL_STEPS ? "Finishing..." : "Saving..."}
      busy={busy}
      onContinue={handleContinue}
      onBack={
        step > 1
          ? () => {
              setError(null);
              setStep(step - 1);
            }
          : undefined
      }
    >
      {step === 1 && (
        <StepIdentity
          email={email}
          existingUsername={existingUsername}
          username={username}
          setUsername={setUsername}
          setUsernameValid={setUsernameValid}
          displayName={displayName}
          setDisplayName={setDisplayName}
        />
      )}
      {step === 2 && (
        <StepTitle
          professionalTitle={professionalTitle}
          setProfessionalTitle={setProfessionalTitle}
        />
      )}
      {step === 3 && (
        <StepLocation
          country={country}
          setCountry={setCountry}
          timezone={timezone}
          setTimezone={setTimezone}
        />
      )}
      {step === 4 && <StepServices selected={services} setSelected={setServices} />}
      {step === 5 && (
        <StepExperience
          level={experienceLevel}
          setLevel={(v: ExperienceLevel) => setExperienceLevel(v)}
          years={yearsExperience}
          setYears={setYearsExperience}
        />
      )}
      {step === 6 && (
        <StepLinks
          portfolioUrl={portfolioUrl}
          setPortfolioUrl={setPortfolioUrl}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
        />
      )}
      {step === 7 && (
        <StepReview
          username={existingUsername}
          displayName={displayName}
          professionalTitle={professionalTitle}
          country={country}
          timezone={timezone}
          services={services}
          experienceLevel={experienceLevel}
          yearsExperience={yearsExperience}
          portfolioUrl={portfolioUrl}
          websiteUrl={websiteUrl}
        />
      )}

      {celebrating && (
        <WelcomeCelebration
          dailyCredits={dailyCredits}
          onContinue={() => {
            router.replace("/dashboard");
            router.refresh();
          }}
        />
      )}
    </StepShell>
  );
}