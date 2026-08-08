import { z } from "zod"

export const OPPORTUNITY_LEVELS = [
  "excellent",
  "strong",
  "potential",
  "negotiation",
  "future",
] as const

export const opportunityLevelSchema = z.enum(OPPORTUNITY_LEVELS)
export type OpportunityLevel = z.infer<typeof opportunityLevelSchema>

export const opportunityDirectionSchema = z.enum([
  "property_to_requests",
  "request_to_properties",
])

export type OpportunityDirection = z.infer<typeof opportunityDirectionSchema>

export type OpportunityReason = {
  key: string
  matched: boolean
  detail?: string
}

export type OpportunityCard = {
  id: string
  direction: OpportunityDirection
  level: OpportunityLevel
  confidence: number
  reasons: OpportunityReason[]
  title: string
  subtitle: string
  href: string
  agent_name: string | null
  created_at: string
  meta: {
    type: string
    city: string
    district?: string
    price?: number | null
    area?: number | null
    offer_type?: string
  }
}

export type OpportunityEmptyGuidance = {
  code: string
  missing?: string[]
  nearestHint?: string
  nextStep?: string
}

export type DiscoverOpportunitiesResult = {
  opportunities: OpportunityCard[]
  grouped: Partial<Record<OpportunityLevel, OpportunityCard[]>>
  readiness: {
    ready: boolean
    missing: string[]
    strength: string
    debounceMs: number
  }
  empty?: OpportunityEmptyGuidance
  algorithm_version: number
}

export const discoverOpportunitiesSchema = z.object({
  direction: opportunityDirectionSchema,
  // Property-side partial
  type: z.string().optional(),
  offer_type: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  custom_neighborhood: z.string().optional(),
  area: z.number().positive().optional().nullable(),
  price: z.number().positive().optional().nullable(),
  // Request-side partial
  budget_min: z.number().positive().optional().nullable(),
  budget_max: z.number().positive().optional().nullable(),
  area_min: z.number().positive().optional().nullable(),
  area_max: z.number().positive().optional().nullable(),
  exclude_id: z.string().uuid().optional().nullable(),
})

export type DiscoverOpportunitiesInput = z.infer<
  typeof discoverOpportunitiesSchema
>
