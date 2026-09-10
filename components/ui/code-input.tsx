"use client";

// Six-box one-time-code input. Auto-advance while typing, backspace goes
// back, pasting a code anywhere fills all boxes, and completing six digits
// triggers onComplete automatically.

import { useRef } from "react";

type CodeInputProps = {
  value: string; // digits only, 0 to 6 characters
  onChange: (digits: string) => void;
  onComplete?: (digits: string) => void;
  disabled?: boolean;
};

export default function CodeInput({ value, onChange, onComplete, disabled }: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function focusIndex(i: number) {
    const idx = Math.min(Math.max(i, 0), 5);
    inputs.current[idx]?.focus();
    inputs.current[idx]?.select();
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, 6);
      onChange(next);
      if (next.length === 6) onComplete?.(next);
      focusIndex(Math.min(next.length, 5));
      return;
    }
    const next = (value.slice(0, index) + digits + value.slice(index + 1)).slice(0, 6);
    onChange(next);
    if (index < 5) focusIndex(index + 1);
    if (next.length === 6) onComplete?.(next);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(index + 1);
    }
  }

  return (
    <div
      className="flex justify-center gap-2"
      onPaste={(e) => {
        e.preventDefault();
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (digits) {
          onChange(digits);
          if (digits.length === 6) onComplete?.(digits);
          focusIndex(Math.min(digits.length, 5));
        }
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Code digit ${i + 1}`}
          className="h-12 w-11 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 disabled:opacity-50"
        />
      ))}
    </div>
  );
}