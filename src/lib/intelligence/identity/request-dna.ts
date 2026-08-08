import { isNeighborhoodOther } from "@/lib/constants/property-types"
import {
  IDENTITY_VERSION,
  resolveProfileKey,
} from "@/lib/intelligence/identity/config"
import { normalizeIdentityText } from "@/lib/intelligence/shared/normalize"
import type { IdentityProfileKey } from "@/types/intelligence/identity"

export const REQUEST_IDENTITY_VERSION = IDENTITY_VERSION

export type RequestDnaComponents = {
  city?: string
  district?: string
  type?: string
  offer_type?: string
  budget_min?: number
  budget_max?: number
  area_min?: number
  area_max?: number
}

export type RequestDna = {
  identity_version: number
  profile_key: IdentityProfileKey
  type: string
  offer_type: string
  components: RequestDnaComponents
}

export type BuildRequestDnaInput = {
  type: string
  offer_type: string
  city: string
  neighborhood?: string | null
  custom_neighborhood?: string | null
  budget_min?: number | null
  budget_max?: number | null
  area_min?: number | null
  area_max?: number | null
}

export function resolveRequestDistrict(input: BuildRequestDnaInput): string {
  if (!input.neighborhood?.trim()) {
    return ""
  }
  if (isNeighborhoodOther(input.neighborhood)) {
    return input.custom_neighborhood?.trim() || ""
  }
  return input.neighborhood.trim()
}

export function buildRequestDna(input: BuildRequestDnaInput): RequestDna {
  const district = resolveRequestDistrict(input)
  const components: RequestDnaComponents = {
    city: normalizeIdentityText(input.city),
    type: input.type,
    offer_type: input.offer_type,
  }

  if (district) {
    components.district = normalizeIdentityText(district)
  }
  if (input.budget_min != null && Number.isFinite(input.budget_min)) {
    components.budget_min = Number(input.budget_min)
  }
  if (input.budget_max != null && Number.isFinite(input.budget_max)) {
    components.budget_max = Number(input.budget_max)
  }
  if (input.area_min != null && Number.isFinite(input.area_min)) {
    components.area_min = Number(input.area_min)
  }
  if (input.area_max != null && Number.isFinite(input.area_max)) {
    components.area_max = Number(input.area_max)
  }

  return {
    identity_version: REQUEST_IDENTITY_VERSION,
    profile_key: resolveProfileKey(input.type),
    type: input.type,
    offer_type: input.offer_type,
    components,
  }
}
