import {
  AREA_TOLERANCE_MIN,
  AREA_TOLERANCE_RATIO,
  GEOHASH_PREFIX_LENGTH,
  IDENTITY_CANDIDATE_LIMIT,
} from "@/lib/intelligence/identity/config"
import type { PropertyDna } from "@/types/intelligence/identity"

export type CandidateFilter = {
  companyId: string
  profileKey: PropertyDna["profile_key"]
  type: string
  city: string
  district: string
  area: number
  geohashPrefix: string | null
  excludePropertyId?: string | null
  limit?: number
}

export function buildAreaBand(area: number): { min: number; max: number } {
  const delta = Math.max(AREA_TOLERANCE_MIN, area * AREA_TOLERANCE_RATIO)
  return {
    min: Math.max(0, area - delta),
    max: area + delta,
  }
}

export function geohashPrefixFromDna(dna: PropertyDna): string | null {
  const coords = dna.components.coordinates
  if (coords?.kind !== "coordinates") {
    return null
  }
  return coords.geohash.slice(0, GEOHASH_PREFIX_LENGTH)
}

export function candidateLimit(limit?: number): number {
  return limit ?? IDENTITY_CANDIDATE_LIMIT
}
