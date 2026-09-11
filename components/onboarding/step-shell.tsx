"use client";

// Shared frame for one onboarding step: progress bar, title, description,
// and the Continue and Back buttons. Keeps every step visually identical.

import { Button } from "@/components/ui/button";

type StepShellProps = {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  error?: string | null;
  continueDisabled?: boolean;
  continueLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onContinue: () => void;
  onBack?: () => void;
  children: React.ReactNode;
};

export default function StepShell({
  step,
  totalSteps,
  title,
  description,
  error,
  continueDisabled,
  continueLabel,
  busyLabel,
  busy,
  onContinue,
  onBack,
  children,
}: StepShellProps) {
  const percent = Math.round((step / totalSteps) * 100);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-medium text-text-faint">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-text-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
      {description && <p className="mt-2 text-sm text-text-muted">{description}</p>}

      <div className="mt-6">{children}</div>

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {onBack && (
          <Button variant="secondary" size="lg" onClick={onBack} disabled={busy}>
            Back
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          onClick={onContinue}
          disabled={continueDisabled}
          loading={busy}
        >
          {busy ? busyLabel ?? "Working..." : continueLabel ?? "Continue"}
        </Button>
      </div>
    </div>
  );
}