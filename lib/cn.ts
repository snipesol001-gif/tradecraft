// Joins conditional class names. Our own 3-line version of clsx,
// so the design system needs no new dependency.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}