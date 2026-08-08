import type { PropertyStatus } from "@/types/property"

/** Shared badge class tokens — one source for listing/request chrome. */
export const URGENT_BADGE_CLASS =
  "border-destructive/30 bg-destructive/15 text-destructive"

export const WARN_BADGE_CLASS =
  "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"

export const MUTED_BADGE_CLASS = "border-border bg-muted text-muted-foreground"

export const URGENT_SWITCH_SURFACE_CLASS =
  "border-destructive/30 bg-destructive/5"

export function getPropertyStatusBadgeClassName(status: PropertyStatus): string {
  switch (status) {
    case "available":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    case "pending":
      return WARN_BADGE_CLASS
    case "sold":
      return URGENT_BADGE_CLASS
    case "rented":
      return "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300"
    case "archived":
      return MUTED_BADGE_CLASS
    default:
      return ""
  }
}

export function getExpiryBadgeClassName(daysLeft: number): string {
  if (daysLeft <= 3) {
    return URGENT_BADGE_CLASS
  }
  if (daysLeft <= 7) {
    return WARN_BADGE_CLASS
  }
  return MUTED_BADGE_CLASS
}
