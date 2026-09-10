"use client";

// Username input with live availability checking.
// Waits 500ms after the last keystroke before asking the server (a debounce),
// so we do not send a request for every single character typed.
// States: IDLE, CHECKING, AVAILABLE (green), TAKEN or INVALID (red).

import { useEffect, useRef, useState } from "react";
import { USERNAME_MAX } from "@/lib/usernames";

type UsernameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (isValid: boolean) => void;
};

export default function UsernameField({ value, onChange, onValidityChange }: UsernameFieldProps) {
  const [status, setStatus] = useState<
    "IDLE" | "CHECKING" | "AVAILABLE" | "TAKEN" | "INVALID"
  >("IDLE");
  const [message, setMessage] = useState<string | null>(null);
  const [checkedValue, setCheckedValue] = useState<string | null>(null);

  // The latest callback is kept in a ref so the effect below depends only on
  // the username value. If it depended on the callback itself, the check
  // would restart every time the parent component re-renders.
  const validityRef = useRef(onValidityChange);
  validityRef.current = onValidityChange;

  useEffect(() => {
    const trimmed = value.trim().toLowerCase();

    if (!trimmed) {
      setStatus("IDLE");
      setMessage(null);
      validityRef.current?.(false);
      return;
    }

    setStatus("CHECKING");
    setMessage("Checking...");

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/username/availability?u=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        const nextStatus =
          data.status === "AVAILABLE"
            ? "AVAILABLE"
            : data.status === "TAKEN"
              ? "TAKEN"
              : "INVALID";
        setStatus(nextStatus);
        setMessage(data.message ?? null);
        setCheckedValue(trimmed);
        validityRef.current?.(nextStatus === "AVAILABLE");
      } catch {
        setStatus("INVALID");
        setMessage("Could not check that username. Try again.");
        validityRef.current?.(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [value]);

  const available = status === "AVAILABLE" && checkedValue === value.trim().toLowerCase();
  const checking = status === "CHECKING";

  return (
    <div>
      <label htmlFor="username" className="block text-sm font-medium mb-1">
        Username
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
          @
        </span>
        <input
          id="username"
          type="text"
          autoComplete="off"
          maxLength={USERNAME_MAX}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          placeholder="yourname"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
        />
      </div>
      {message && (
        <p
          className={
            available
              ? "mt-1 text-sm text-emerald-600 dark:text-emerald-400"
              : checking
                ? "mt-1 text-sm text-neutral-500 dark:text-neutral-400"
                : "mt-1 text-sm text-red-600 dark:text-red-400"
          }
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}