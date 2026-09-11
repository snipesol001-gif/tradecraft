"use client";

// TradeCraft's text input. Consistent height with Button md, quiet focus
// ring, honest placeholder color.

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-faint transition-colors duration-150 focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ring/25 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, className)} {...props} />;
  }
);