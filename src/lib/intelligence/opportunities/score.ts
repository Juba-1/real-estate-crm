import {
  OPPORTUNITY_WEIGHTS,
  levelFromConfidence,
} from "@/lib/intelligence/opportunities/config"
import { textsEqual } from "@/lib/intelligence/shared"
import { resolveProfileKey } from "@/lib/intelligence/shared/profile"
import type {
  OpportunityLevel,
  OpportunityReason,
} from "@/types/intelligence/opportunities"

export type PropertyOpportunitySide = {
  type: string
  offer_type?: string
  city: string
  district?: string
  area?: number | null
  price?: number | null
}

export type RequestOpportunitySide = {
  type: string
  offer_type?: string
  city: string
  district?: string
  area_min?: number | null
  area_max?: number | null
  budget_min?: number | null
  budget_max?: number | null
}

export type OpportunityScore = {
  confidence: number
  level: OpportunityLevel
  reasons: OpportunityReason[]
}

function typesCompatible(a: string, b: string): boolean {
  if (a === b) return true
  return resolveProfileKey(a) === resolveProfileKey(b) && a !== "other" && b !== "other"
}

function inRange(
  value: number,
  min?: number | null,
  max?: number | null,
  softPct = 0.08
): { score: number; matched: boolean; detail: string } {
  if (!Number.isFinite(value)) {
    return { score: 0, matched: false, detail: "missing" }
  }
  const hasMin = min != null && min > 0
  const hasMax = max != null && max > 0
  if (!hasMin && !hasMax) {
    return { score: 0, matched: false, detail: "no_band" }
  }

  const lo = hasMin ? (min as number) : 0
  const hi = hasMax ? (max as number) : Number.POSITIVE_INFINITY

  if (value >= lo && value <= hi) {
    return { score: 1, matched: true, detail: "within" }
  }

  // Soft negotiation band
  const softLo = hasMin ? lo * (1 - softPct) : 0
  const softHi = hasMax && Number.isFinite(hi) ? hi * (1 + softPct) : hi

  if (value >= softLo && value <= softHi) {
    const over =
      value > hi && Number.isFinite(hi)
        ? Math.round(((value - hi) / hi) * 100)
        : value < lo
          ? Math.round(((lo - value) / lo) * 100)
          : 0
    return {
      score: 0.55,
      matched: false,
      detail: `soft_${over}`,
    }
  }

  return { score: 0.1, matched: false, detail: "outside" }
}

/**
 * Score a property listing against a client request (or the reverse — same math).
 */
export function scorePropertyRequestOpportunity(
  property: PropertyOpportunitySide,
  request: RequestOpportunitySide
): OpportunityScore {
  const reasons: OpportunityReason[] = []
  let weighted = 0
  let total = 0

  // Type
  {
    const w = OPPORTUNITY_WEIGHTS.type
    const matched = typesCompatible(property.type, request.type)
    const score = matched
      ? property.type === request.type
        ? 1
        : 0.75
      : 0.15
    weighted += w * score
    total += w
    reasons.push({
      key: matched ? "match_type" : "diff_type",
      matched,
      detail: matched && property.type !== request.type ? "family" : undefined,
    })
  }

  // Offer type
  if (property.offer_type && request.offer_type) {
    const w = OPPORTUNITY_WEIGHTS.offer_type
    const matched = property.offer_type === request.offer_type
    weighted += w * (matched ? 1 : 0.2)
    total += w
    reasons.push({
      key: matched ? "match_offer" : "diff_offer",
      matched,
    })
  }

  // City
  {
    const w = OPPORTUNITY_WEIGHTS.city
    const matched = textsEqual(property.city, request.city)
    weighted += w * (matched ? 1 : 0)
    total += w
    reasons.push({
      key: matched ? "match_city" : "diff_city",
      matched,
    })
  }

  // District
  if (property.district?.trim() && request.district?.trim()) {
    const w = OPPORTUNITY_WEIGHTS.district
    const matched = textsEqual(property.district, request.district)
    weighted += w * (matched ? 1 : 0.25)
    total += w
    reasons.push({
      key: matched ? "match_district" : "diff_district",
      matched,
    })
  }

  // Area vs request band
  if (property.area != null && property.area > 0) {
    const range = inRange(property.area, request.area_min, request.area_max)
    if (range.detail !== "no_band") {
      const w = OPPORTUNITY_WEIGHTS.area
      weighted += w * range.score
      total += w
      reasons.push({
        key: range.matched
          ? "match_area"
          : range.detail.startsWith("soft")
            ? "nego_area"
            : "diff_area",
        matched: range.matched,
        detail: range.detail,
      })
    }
  }

  // Price vs budget
  if (property.price != null && property.price > 0) {
    const range = inRange(property.price, request.budget_min, request.budget_max)
    if (range.detail !== "no_band") {
      const w = OPPORTUNITY_WEIGHTS.budget
      weighted += w * range.score
      total += w
      reasons.push({
        key: range.matched
          ? "match_budget"
          : range.detail.startsWith("soft")
            ? "nego_budget"
            : "diff_budget",
        matched: range.matched,
        detail: range.detail,
      })
    }
  }

  const confidence =
    total === 0 ? 0 : Math.round((weighted / total) * 1000) / 10

  return {
    confidence,
    level: levelFromConfidence(confidence),
    reasons,
  }
}
