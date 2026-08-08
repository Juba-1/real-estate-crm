import {
  MEANINGFUL_CONFIDENCE_DELTA,
  NOTIFY_COOLDOWN_MS,
  PRIORITY_RANK,
  type NotificationPriority,
  type OpportunityNotifyEventType,
  isNotifyEligible,
  priorityFromOpportunity,
} from "@/lib/intelligence/opportunities/notify/policy"
import type { OpportunityLevel } from "@/types/intelligence/opportunities"

export type ReceiptSnapshot = {
  last_confidence: number
  last_priority: NotificationPriority
  last_notified_at: string
} | null

export type AntiSpamDecision =
  | { notify: false; reason: string }
  | {
      notify: true
      eventType: OpportunityNotifyEventType
      priority: NotificationPriority
    }

/**
 * Decide whether a scored opportunity should produce a notification.
 * Pure function — no I/O.
 */
export function decideOpportunityNotify(input: {
  confidence: number
  level: OpportunityLevel
  receipt: ReceiptSnapshot
  nowMs?: number
}): AntiSpamDecision {
  if (!isNotifyEligible(input.confidence)) {
    return { notify: false, reason: "below_threshold" }
  }

  const priority = priorityFromOpportunity(input.level, input.confidence)
  const now = input.nowMs ?? Date.now()

  if (!input.receipt) {
    const eventType: OpportunityNotifyEventType =
      priority === "critical" ? "new_excellent" : "new_strong"
    return { notify: true, eventType, priority }
  }

  const prevConfidence = Number(input.receipt.last_confidence)
  const prevPriority = input.receipt.last_priority
  const lastAt = new Date(input.receipt.last_notified_at).getTime()
  const inCooldown = Number.isFinite(lastAt) && now - lastAt < NOTIFY_COOLDOWN_MS

  const confidenceUp =
    input.confidence - prevConfidence >= MEANINGFUL_CONFIDENCE_DELTA
  const priorityUp =
    PRIORITY_RANK[priority] > PRIORITY_RANK[prevPriority]

  // Crossed into notify band from a previously weaker recorded state
  const becameMatchable =
    prevConfidence < 75 && input.confidence >= 75

  if (priorityUp) {
    return { notify: true, eventType: "priority_upgraded", priority }
  }

  if (becameMatchable) {
    return { notify: true, eventType: "became_matchable", priority }
  }

  if (confidenceUp) {
    return { notify: true, eventType: "confidence_increased", priority }
  }

  if (inCooldown) {
    return { notify: false, reason: "cooldown_no_material_change" }
  }

  // Outside cooldown but no material change — still suppress (duplicate)
  return { notify: false, reason: "duplicate_suppressed" }
}
