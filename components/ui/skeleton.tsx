// Loading placeholder block. Widths and heights come from className.

import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-sunken", className)} aria-hidden />;
}