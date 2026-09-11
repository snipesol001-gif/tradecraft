"use client";

// Native select styled to match Input. Native dropdown behavior kept on
// purpose: reliable on every platform, fully keyboard accessible.

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary transition-colors duration-150 focus:outline-none focus:border-border-strong focus:ring-2 focus:ring-ring/25 disabled:opacity-50";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(base, className)} {...props} />;
  }
);