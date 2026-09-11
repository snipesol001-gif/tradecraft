// Small status label. Variants mirror the semantic feedback colors.

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "success" | "warning" | "danger";

const variants: Record<Variant, string> = {
  default: "border-border bg-sunken text-text-muted",
  success: "border-success-border bg-success-soft text-success",
  warning: "border-warning-border bg-warning-soft text-warning",
  danger: "border-danger-border bg-danger-soft text-danger",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: Variant };

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}