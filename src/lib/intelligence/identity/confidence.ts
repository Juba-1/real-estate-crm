import { CONFIDENCE_THRESHOLDS } from "@/lib/intelligence/identity/config"
import type { ConfidenceLevel } from "@/types/intelligence/identity"

export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.critical) {
    return "critical"
  }
  if (score >= CONFIDENCE_THRESHOLDS.very_high) {
    return "very_high"
  }
  if (score >= CONFIDENCE_THRESHOLDS.high) {
    return "high"
  }
  if (score >= CONFIDENCE_THRESHOLDS.medium) {
    return "medium"
  }
  return "low"
}
