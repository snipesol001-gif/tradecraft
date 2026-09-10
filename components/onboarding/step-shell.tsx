"use client";

// Shared frame for one onboarding step: progress bar, title, description,
// and the Continue and Back buttons. Keeps every step visually identical.

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
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-1.5 rounded-full bg-neutral-900 dark:bg-white transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      )}

      <div className="mt-6">{children}</div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 font-medium px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || busy}
          className="flex-1 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {busy ? busyLabel ?? "Working..." : continueLabel ?? "Continue"}
        </button>
      </div>
    </div>
  );
}