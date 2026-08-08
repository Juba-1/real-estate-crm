import type { OpportunityLevel } from "@/types/intelligence/opportunities"

export const OPPORTUNITY_ALGORITHM_VERSION = 1

export const OPPORTUNITY_CANDIDATE_LIMIT = 40

/** Weights for property↔request opportunity scoring (configurable). */
export const OPPORTUNITY_WEIGHTS = {
  type: 22,
  offer_type: 10,
  city: 22,
  district: 16,
  area: 15,
  budget: 15,
} as const

export const OPPORTUNITY_LEVEL_THRESHOLDS: Record<
  OpportunityLevel,
  number
> = {
  excellent: 90,
  strong: 75,
  potential: 58,
  negotiation: 42,
  future: 28,
}

export function levelFromConfidence(confidence: number): OpportunityLevel {
  if (confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.excellent) return "excellent"
  if (confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.strong) return "strong"
  if (confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.potential) return "potential"
  if (confidence >= OPPORTUNITY_LEVEL_THRESHOLDS.negotiation) return "negotiation"
  return "future"
}
