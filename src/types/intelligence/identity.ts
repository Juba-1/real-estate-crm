import { z } from "zod"

export const IDENTITY_PROFILE_KEYS = [
  "land",
  "villa",
  "apartment",
  "generic",
] as const

export const identityProfileKeySchema = z.enum(IDENTITY_PROFILE_KEYS)
export type IdentityProfileKey = z.infer<typeof identityProfileKeySchema>

export const CONFIDENCE_LEVELS = [
  "critical",
  "very_high",
  "high",
  "medium",
  "low",
] as const

export const confidenceLevelSchema = z.enum(CONFIDENCE_LEVELS)
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>

export const COORDINATE_SOURCES = ["google_maps_url", "manual"] as const
export type CoordinateSource = (typeof COORDINATE_SOURCES)[number]

export const INTELLIGENCE_DOMAINS = [
  "identity",
  "matching",
  "recommendations",
  "analytics",
  "ai",
] as const

export const intelligenceDomainSchema = z.enum(INTELLIGENCE_DOMAINS)
export type IntelligenceDomain = z.infer<typeof intelligenceDomainSchema>

export const IDENTITY_EVENT_TYPES = [
  "warning_shown",
  "continue_anyway",
  "cancelled",
  "opened_existing",
] as const

export const identityEventTypeSchema = z.enum(IDENTITY_EVENT_TYPES)
export type IdentityEventType = z.infer<typeof identityEventTypeSchema>

export const DNA_COMPONENT_KEYS = [
  "city",
  "district",
  "plan_number",
  "plot_letter",
  "plot_number",
  "area",
  "rooms",
  "street_width",
  "age",
  "floor",
  "project_name",
  "coordinates",
] as const

export type DnaComponentKey = (typeof DNA_COMPONENT_KEYS)[number]

export type DnaComponentValue =
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "coordinates"; lat: number; lng: number; geohash: string }

export type PropertyDna = {
  identity_version: number
  profile_key: IdentityProfileKey
  type: string
  components: Partial<Record<DnaComponentKey, DnaComponentValue>>
  coordinate_source: CoordinateSource | null
}

export type ConfidenceBreakdownItem = {
  component: DnaComponentKey
  weight: number
  score: number
  matched: boolean
  detail?: string
}

export type IdentityReason = {
  key: string
  matched: boolean
  detail?: string
  component?: DnaComponentKey
}

export type IdentityMatchResult = {
  property_id: string
  confidence: number
  level: ConfidenceLevel
  reasons: IdentityReason[]
  confidence_breakdown: ConfidenceBreakdownItem[]
  agent_name: string | null
  created_at: string
  type: string
  city: string
  district: string
  area: number
}

export type AnalyzeIdentityResult = {
  matches: IdentityMatchResult[]
  warn: boolean
  identity_version: number
}

export const identityOverrideSchema = z.object({
  acknowledged: z.literal(true),
  match_property_id: z.string().uuid().optional(),
  confidence: z.number().min(0).max(100).optional(),
})

export type IdentityOverride = z.infer<typeof identityOverrideSchema>

export function parseIdentityOverride(
  value: unknown
): IdentityOverride | null {
  const parsed = identityOverrideSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export const logIdentityEventSchema = z.object({
  event_type: identityEventTypeSchema,
  entity_id: z.string().uuid().optional().nullable(),
  related_entity_id: z.string().uuid().optional().nullable(),
  confidence: z.number().min(0).max(100).optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type LogIdentityEventInput = z.infer<typeof logIdentityEventSchema>
