/**
 * Opportunity notification policy — thresholds, cooldown, priority.
 * Pure config; no I/O.
 */

import type { OpportunityLevel } from "@/types/intelligence/opportunities"
import { OPPORTUNITY_LEVEL_THRESHOLDS } from "@/lib/intelligence/opportunities/config"

export const OPPORTUNITY_NOTIFY_VERSION = 1

/** Do not notify below this confidence (strong = 75). */
export const NOTIFY_MIN_CONFIDENCE = OPPORTUNITY_LEVEL_THRESHOLDS.strong

/** Ignore confidence noise below this delta (percentage points). */
export const MEANINGFUL_CONFIDENCE_DELTA = 10

/** Suppress repeat notifies for the same fingerprint within this window unless material change. */
export const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** Cap how many opportunities are mentioned in one grouped message. */
export const MAX_GROUPED_OPPORTUNITIES = 5

export type NotificationPriority = "critical" | "high" | "normal" | "low"

export type OpportunityNotifyEventType =
  | "new_excellent"
  | "new_strong"
  | "confidence_increased"
  | "priority_upgraded"
  | "became_matchable"

export const PRIORITY_RANK: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

export function priorityFromOpportunity(
  level: OpportunityLevel,
  confidence: number
): NotificationPriority {
  if (level === "excellent" || confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.excellent) {
    return "critical"
  }
  if (level === "strong" || confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.strong) {
    return "high"
  }
  if (level === "potential" || confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.potential) {
    return "normal"
  }
  return "low"
}

export function isNotifyEligible(confidence: number): boolean {
  return confidence >= NOTIFY_MIN_CONFIDENCE
}

/**
 * Stable pair fingerprint — order-independent pair id for dedupe.
 */
export function opportunityFingerprint(
  propertyId: string,
  requestId: string
): string {
  return `prop:${propertyId}|req:${requestId}`
}

/**
 * Persist anti-spam receipts only after in-app notify succeeded.
 * Failed / skipped notify must not suppress future retries.
 */
export function shouldPersistOpportunityReceipt(
  notifyResult: { error: string } | null
): boolean {
  return !notifyResult?.error
}
