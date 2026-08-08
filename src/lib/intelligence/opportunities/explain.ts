import type {
  OpportunityEmptyGuidance,
  OpportunityLevel,
  OpportunityCard,
} from "@/types/intelligence/opportunities"
import { OPPORTUNITY_LEVELS } from "@/types/intelligence/opportunities"

export function groupOpportunities(
  cards: OpportunityCard[]
): Partial<Record<OpportunityLevel, OpportunityCard[]>> {
  const grouped: Partial<Record<OpportunityLevel, OpportunityCard[]>> = {}
  for (const level of OPPORTUNITY_LEVELS) {
    const items = cards.filter((c) => c.level === level)
    if (items.length > 0) {
      grouped[level] = items
    }
  }
  return grouped
}

export function buildEmptyGuidance(params: {
  ready: boolean
  missing: string[]
  hasCandidates: boolean
  scoredCount: number
}): OpportunityEmptyGuidance {
  if (!params.ready) {
    return {
      code: "insufficient_input",
      missing: params.missing,
      nextStep:
        params.missing.includes("city")
          ? "enter_city"
          : params.missing.includes("type")
            ? "enter_type"
            : "enter_more",
    }
  }

  if (!params.hasCandidates) {
    return {
      code: "no_candidates",
      nextStep: "widen_location_or_type",
      nearestHint: "try_broader_district",
    }
  }

  if (params.scoredCount === 0) {
    return {
      code: "no_fit",
      nextStep: "relax_budget_or_area",
      nearestHint: "budget_or_area_restrictive",
    }
  }

  return {
    code: "none",
    nextStep: "continue_editing",
  }
}
