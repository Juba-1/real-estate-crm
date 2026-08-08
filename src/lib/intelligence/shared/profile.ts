import type { IdentityProfileKey } from "@/types/intelligence/identity"

/**
 * Profile key resolution is shared taxonomy — not identity-scoring logic.
 * Identity and Opportunity may both classify listing shapes the same way.
 */
const VILLA_TYPES = new Set(["villa", "duplex_villa", "rest_house", "chalet"])
const APARTMENT_TYPES = new Set(["apartment", "duplex_apartment"])

export function resolveProfileKey(type: string): IdentityProfileKey {
  if (type === "land") {
    return "land"
  }
  if (VILLA_TYPES.has(type)) {
    return "villa"
  }
  if (APARTMENT_TYPES.has(type)) {
    return "apartment"
  }
  return "generic"
}

export function resolveDistrictLabel(input: {
  neighborhood: string
  custom_neighborhood?: string | null
  isNeighborhoodOther: (value: string) => boolean
}): string {
  if (input.isNeighborhoodOther(input.neighborhood)) {
    return input.custom_neighborhood?.trim() || input.neighborhood
  }
  return input.neighborhood
}
