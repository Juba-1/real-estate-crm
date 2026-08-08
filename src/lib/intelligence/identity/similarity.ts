import {
  AREA_TOLERANCE_RATIO,
  COORDINATE_MATCH_METERS,
  PROFILE_WEIGHTS,
} from "@/lib/intelligence/identity/config"
import { confidenceLevelFromScore } from "@/lib/intelligence/identity/confidence"
import { distanceMeters } from "@/lib/intelligence/identity/maps-coordinates"
import { numberSimilarity } from "@/lib/intelligence/shared/normalize"
import type {
  ConfidenceBreakdownItem,
  DnaComponentKey,
  IdentityReason,
  PropertyDna,
} from "@/types/intelligence/identity"

export type SimilarityScore = {
  confidence: number
  level: ReturnType<typeof confidenceLevelFromScore>
  reasons: IdentityReason[]
  confidence_breakdown: ConfidenceBreakdownItem[]
}

function scoreComponent(
  key: DnaComponentKey,
  a: PropertyDna,
  b: PropertyDna
): { score: number; matched: boolean; detail?: string } | null {
  const left = a.components[key]
  const right = b.components[key]
  if (!left || !right) {
    return null
  }

  if (left.kind === "text" && right.kind === "text") {
    const matched = left.value === right.value
    return {
      score: matched ? 1 : 0,
      matched,
      detail: matched ? "exact" : "mismatch",
    }
  }

  if (left.kind === "number" && right.kind === "number") {
    if (key === "rooms" || key === "floor") {
      const matched = left.value === right.value
      return {
        score: matched ? 1 : Math.max(0, 1 - Math.abs(left.value - right.value) / 3),
        matched,
        detail: matched
          ? "exact"
          : `diff_${Math.abs(left.value - right.value)}`,
      }
    }

    const score = numberSimilarity(left.value, right.value, AREA_TOLERANCE_RATIO)
    const pct = Math.round(
      (Math.abs(left.value - right.value) / ((left.value + right.value) / 2)) * 100
    )
    return {
      score,
      matched: score >= 0.85,
      detail: `diff_pct_${pct}`,
    }
  }

  if (left.kind === "coordinates" && right.kind === "coordinates") {
    const meters = distanceMeters(
      { lat: left.lat, lng: left.lng },
      { lat: right.lat, lng: right.lng }
    )
    const matched = meters <= COORDINATE_MATCH_METERS
    const score =
      meters <= COORDINATE_MATCH_METERS
        ? 1
        : meters <= COORDINATE_MATCH_METERS * 4
          ? 1 - (meters - COORDINATE_MATCH_METERS) / (COORDINATE_MATCH_METERS * 4)
          : 0
    return {
      score: Math.max(0, score),
      matched,
      detail: `meters_${Math.round(meters)}`,
    }
  }

  return null
}

export function scoreSimilarity(a: PropertyDna, b: PropertyDna): SimilarityScore {
  const weights = PROFILE_WEIGHTS[a.profile_key] ?? PROFILE_WEIGHTS.generic
  const breakdown: ConfidenceBreakdownItem[] = []
  const reasons: IdentityReason[] = []

  let weightedSum = 0
  let weightTotal = 0

  for (const [key, weight] of Object.entries(weights) as Array<
    [DnaComponentKey, number]
  >) {
    if (!weight) {
      continue
    }

    const result = scoreComponent(key, a, b)
    if (!result) {
      continue
    }

    weightTotal += weight
    weightedSum += weight * result.score

    breakdown.push({
      component: key,
      weight,
      score: result.score,
      matched: result.matched,
      detail: result.detail,
    })

    reasons.push({
      key: result.matched ? `match_${key}` : `diff_${key}`,
      matched: result.matched,
      detail: result.detail,
      component: key,
    })
  }

  const confidence =
    weightTotal === 0 ? 0 : Math.round((weightedSum / weightTotal) * 1000) / 10

  return {
    confidence,
    level: confidenceLevelFromScore(confidence),
    reasons,
    confidence_breakdown: breakdown,
  }
}
