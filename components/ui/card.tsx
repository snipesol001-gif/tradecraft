// TradeCraft's Card system. Variants create hierarchy: default (standard
// panels), raised (dialogs, popovers), interactive (clickable cards with
// hover lift), warning (out-of-credits style states). Compose with
// CardTitle and CardBody for consistent internal spacing.

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "raised" | "interactive" | "warning";

const variants: Record<Variant, string> = {
  default: "border border-border bg-surface shadow-card",
  raised: "border border-border bg-surface-raised shadow-raised",
  interactive:
    "border border-border bg-surface shadow-card transition-all duration-200 hover:border-border-strong hover:-translate-y-0.5",
  warning: "border border-warning-border bg-warning-soft",
};

type CardProps = HTMLAttributes<HTMLDivElement> & { variant?: Variant };

export function Card({ variant = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        variants[variant],
        variant !== "warning" && "tc-card",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("px-5 pt-5 text-base font-semibold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}