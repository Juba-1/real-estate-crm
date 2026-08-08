/**
 * Shared Intelligence helpers — domain-independent.
 * Must NOT import from identity / opportunities / matching.
 */

export {
  normalizeIdentityText,
  textsEqual,
  numberSimilarity,
} from "@/lib/intelligence/shared/normalize"
export {
  resolveProfileKey,
  resolveDistrictLabel,
} from "@/lib/intelligence/shared/profile"

export type OpportunityDirection =
  | "property_to_requests"
  | "request_to_properties"

/** Minimum progressive readiness for a server query. */
export type ProgressiveReadiness = {
  ready: boolean
  missing: string[]
  strength: "none" | "weak" | "moderate" | "strong"
  /** Suggested debounce ms for the client. */
  debounceMs: number
}

export function assessPropertyProgressiveReadiness(input: {
  type?: string
  city?: string
  neighborhood?: string
  area?: number | null
  price?: number | null
}): ProgressiveReadiness {
  const missing: string[] = []
  if (!input.city?.trim()) missing.push("city")
  if (!input.type?.trim()) missing.push("type")

  if (missing.length > 0) {
    return { ready: false, missing, strength: "none", debounceMs: 600 }
  }

  let strength: ProgressiveReadiness["strength"] = "weak"
  let debounceMs = 450

  if (input.neighborhood?.trim()) {
    strength = "moderate"
    debounceMs = 320
  }
  if (input.area && input.area > 0) {
    strength = "strong"
    debounceMs = 250
  }
  if (input.price && input.price > 0) {
    strength = "strong"
    debounceMs = 220
  }

  return { ready: true, missing: [], strength, debounceMs }
}

export function assessRequestProgressiveReadiness(input: {
  type?: string
  city?: string
  neighborhood?: string
  area_min?: number | null
  area_max?: number | null
  budget_min?: number | null
  budget_max?: number | null
}): ProgressiveReadiness {
  const missing: string[] = []
  if (!input.city?.trim()) missing.push("city")
  if (!input.type?.trim()) missing.push("type")

  if (missing.length > 0) {
    return { ready: false, missing, strength: "none", debounceMs: 600 }
  }

  let strength: ProgressiveReadiness["strength"] = "weak"
  let debounceMs = 450

  if (input.neighborhood?.trim()) {
    strength = "moderate"
    debounceMs = 320
  }
  if (
    (input.area_min && input.area_min > 0) ||
    (input.area_max && input.area_max > 0)
  ) {
    strength = "strong"
    debounceMs = 250
  }
  if (
    (input.budget_min && input.budget_min > 0) ||
    (input.budget_max && input.budget_max > 0)
  ) {
    strength = "strong"
    debounceMs = 220
  }

  return { ready: true, missing: [], strength, debounceMs }
}
