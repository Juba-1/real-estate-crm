import type { IdentityProfileKey } from "@/types/intelligence/identity"
import type { DnaComponentKey } from "@/types/intelligence/identity"
import { resolveProfileKey as resolveSharedProfileKey } from "@/lib/intelligence/shared/profile"

/** Algorithm version — bump when DNA/scoring semantics change. */
export const IDENTITY_VERSION = 1

/** Warn dialog when best match confidence >= this percentage. */
export const IDENTITY_WARN_THRESHOLD = 75

export const IDENTITY_CANDIDATE_LIMIT = 50

/** Area relative tolerance for candidate prefilter (e.g. 0.2 = ±20%). */
export const AREA_TOLERANCE_RATIO = 0.2

/** Absolute area floor for tolerance band (sqm). */
export const AREA_TOLERANCE_MIN = 20

/** Geohash precision (~150m at precision 7). */
export const GEOHASH_PRECISION = 7

/** Prefix length for candidate geospatial narrow. */
export const GEOHASH_PREFIX_LENGTH = 5

/** Coordinates match if within this distance (meters). */
export const COORDINATE_MATCH_METERS = 25

export const CONFIDENCE_THRESHOLDS = {
  critical: 95,
  very_high: 88,
  high: 75,
  medium: 55,
  low: 0,
} as const

export type ProfileWeights = Partial<Record<DnaComponentKey, number>>

export const PROFILE_WEIGHTS: Record<IdentityProfileKey, ProfileWeights> = {
  land: {
    city: 12,
    district: 12,
    plan_number: 18,
    plot_letter: 10,
    plot_number: 18,
    area: 12,
    coordinates: 18,
  },
  villa: {
    city: 12,
    district: 12,
    area: 14,
    rooms: 14,
    street_width: 10,
    age: 10,
    coordinates: 28,
  },
  apartment: {
    city: 12,
    district: 12,
    area: 12,
    rooms: 12,
    floor: 12,
    project_name: 14,
    coordinates: 26,
  },
  generic: {
    city: 18,
    district: 18,
    area: 24,
    coordinates: 40,
  },
}

export function resolveProfileKey(type: string): IdentityProfileKey {
  return resolveSharedProfileKey(type)
}
