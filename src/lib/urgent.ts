/**
 * Single source of truth for "is this row currently urgent" and the
 * urgent-first sort order used by properties, requests, and search.
 *
 * There is no stored boolean and no cron job — urgency is always derived
 * from `urgent_until > NOW()` at read time, per project rules.
 */

export function isCurrentlyUrgent(
  urgentUntil: string | null | undefined
): boolean {
  if (!urgentUntil) {
    return false
  }

  return new Date(urgentUntil).getTime() > Date.now()
}

export function compareByUrgency<
  T extends { urgent_until: string | null; created_at: string },
>(a: T, b: T): number {
  const aUrgent = isCurrentlyUrgent(a.urgent_until)
  const bUrgent = isCurrentlyUrgent(b.urgent_until)

  if (aUrgent !== bUrgent) {
    return aUrgent ? -1 : 1
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}
