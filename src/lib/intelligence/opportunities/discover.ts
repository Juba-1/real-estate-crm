import {
  OPPORTUNITY_ALGORITHM_VERSION,
  OPPORTUNITY_LEVEL_THRESHOLDS,
} from "@/lib/intelligence/opportunities/config"
import { buildEmptyGuidance, groupOpportunities } from "@/lib/intelligence/opportunities/explain"
import {
  scorePropertyRequestOpportunity,
  type PropertyOpportunitySide,
  type RequestOpportunitySide,
} from "@/lib/intelligence/opportunities/score"
import type {
  DiscoverOpportunitiesResult,
  OpportunityCard,
  OpportunityDirection,
} from "@/types/intelligence/opportunities"
import type { ProgressiveReadiness } from "@/lib/intelligence/shared"

export type RequestCandidate = RequestOpportunitySide & {
  id: string
  agent_id: string
  agent_name: string | null
  created_at: string
  details?: string | null
}

export type PropertyCandidate = PropertyOpportunitySide & {
  id: string
  agent_id: string
  agent_name: string | null
  created_at: string
  neighborhood?: string | null
}

export function discoverFromPropertySide(
  property: PropertyOpportunitySide,
  requests: RequestCandidate[],
  readiness: ProgressiveReadiness
): DiscoverOpportunitiesResult {
  if (!readiness.ready) {
    return {
      opportunities: [],
      grouped: {},
      readiness,
      empty: buildEmptyGuidance({
        ready: false,
        missing: readiness.missing,
        hasCandidates: false,
        scoredCount: 0,
      }),
      algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
    }
  }

  const cards: OpportunityCard[] = []

  for (const request of requests) {
    const scored = scorePropertyRequestOpportunity(property, request)
    if (scored.confidence < OPPORTUNITY_LEVEL_THRESHOLDS.future) {
      continue
    }

    cards.push({
      id: request.id,
      direction: "property_to_requests",
      level: scored.level,
      confidence: scored.confidence,
      reasons: scored.reasons,
      title: `${request.type} · ${request.offer_type ?? ""}`.trim(),
      subtitle: [request.city, request.district].filter(Boolean).join(" — "),
      href: "/dashboard/requests",
      agent_name: request.agent_name,
      created_at: request.created_at,
      meta: {
        type: request.type,
        city: request.city,
        district: request.district,
        offer_type: request.offer_type,
      },
    })
  }

  cards.sort((a, b) => b.confidence - a.confidence)

  return {
    opportunities: cards,
    grouped: groupOpportunities(cards),
    readiness,
    empty:
      cards.length === 0
        ? buildEmptyGuidance({
            ready: true,
            missing: [],
            hasCandidates: requests.length > 0,
            scoredCount: 0,
          })
        : undefined,
    algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
  }
}

export function discoverFromRequestSide(
  request: RequestOpportunitySide,
  properties: PropertyCandidate[],
  readiness: ProgressiveReadiness
): DiscoverOpportunitiesResult {
  if (!readiness.ready) {
    return {
      opportunities: [],
      grouped: {},
      readiness,
      empty: buildEmptyGuidance({
        ready: false,
        missing: readiness.missing,
        hasCandidates: false,
        scoredCount: 0,
      }),
      algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
    }
  }

  const cards: OpportunityCard[] = []

  for (const property of properties) {
    const scored = scorePropertyRequestOpportunity(property, request)
    if (scored.confidence < OPPORTUNITY_LEVEL_THRESHOLDS.future) {
      continue
    }

    cards.push({
      id: property.id,
      direction: "request_to_properties",
      level: scored.level,
      confidence: scored.confidence,
      reasons: scored.reasons,
      title: `${property.type} · ${property.offer_type ?? ""}`.trim(),
      subtitle: [property.city, property.district || property.neighborhood]
        .filter(Boolean)
        .join(" — "),
      href: `/dashboard/properties/${property.id}/edit`,
      agent_name: property.agent_name,
      created_at: property.created_at,
      meta: {
        type: property.type,
        city: property.city,
        district: property.district || property.neighborhood || undefined,
        price: property.price,
        area: property.area,
        offer_type: property.offer_type,
      },
    })
  }

  cards.sort((a, b) => b.confidence - a.confidence)

  return {
    opportunities: cards,
    grouped: groupOpportunities(cards),
    readiness,
    empty:
      cards.length === 0
        ? buildEmptyGuidance({
            ready: true,
            missing: [],
            hasCandidates: properties.length > 0,
            scoredCount: 0,
          })
        : undefined,
    algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
  }
}

export type { OpportunityDirection }
