import { isNeighborhoodOther } from "@/lib/constants/property-types"
import {
  GEOHASH_PRECISION,
  IDENTITY_VERSION,
  resolveProfileKey,
} from "@/lib/intelligence/identity/config"
import { encodeGeohash } from "@/lib/intelligence/identity/geohash"
import { parseMapsCoordinates } from "@/lib/intelligence/identity/maps-coordinates"
import { normalizeIdentityText } from "@/lib/intelligence/shared/normalize"
import { resolveDistrictLabel } from "@/lib/intelligence/shared/profile"
import type {
  CoordinateSource,
  DnaComponentValue,
  PropertyDna,
} from "@/types/intelligence/identity"

export type BuildDnaInput = {
  type: string
  city: string
  neighborhood: string
  custom_neighborhood?: string | null
  area: number
  plot_letter?: string | null
  google_maps_url?: string | null
  specs?: {
    rooms?: number
    age?: number
    street_width?: number
    plan_number?: string
    plot_number?: string
    floor?: number
    project_name?: string
  }
  latitude?: number | null
  longitude?: number | null
}

function textComponent(value: string | null | undefined): DnaComponentValue | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }
  return { kind: "text", value: normalizeIdentityText(trimmed) }
}

function numberComponent(value: number | null | undefined): DnaComponentValue | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return undefined
  }
  return { kind: "number", value }
}

export function resolveDistrict(input: BuildDnaInput): string {
  return resolveDistrictLabel({
    neighborhood: input.neighborhood,
    custom_neighborhood: input.custom_neighborhood,
    isNeighborhoodOther,
  })
}

export function buildPropertyDna(input: BuildDnaInput): PropertyDna {
  const profile_key = resolveProfileKey(input.type)
  const district = resolveDistrict(input)

  let coordinate_source: CoordinateSource | null = null
  let lat = input.latitude ?? null
  let lng = input.longitude ?? null

  if ((lat === null || lng === null) && input.google_maps_url) {
    const parsed = parseMapsCoordinates(input.google_maps_url)
    if (parsed) {
      lat = parsed.lat
      lng = parsed.lng
      coordinate_source = "google_maps_url"
    }
  } else if (lat !== null && lng !== null) {
    coordinate_source = "manual"
  }

  const components: PropertyDna["components"] = {}

  const city = textComponent(input.city)
  if (city) components.city = city

  const districtComp = textComponent(district)
  if (districtComp) components.district = districtComp

  const area = numberComponent(input.area)
  if (area) components.area = area

  const plan = textComponent(input.specs?.plan_number)
  if (plan) components.plan_number = plan

  const plotLetter = textComponent(input.plot_letter)
  if (plotLetter) components.plot_letter = plotLetter

  const plotNumber = textComponent(input.specs?.plot_number)
  if (plotNumber) components.plot_number = plotNumber

  const rooms = numberComponent(input.specs?.rooms)
  if (rooms) components.rooms = rooms

  const street = numberComponent(input.specs?.street_width)
  if (street) components.street_width = street

  const age = numberComponent(input.specs?.age)
  if (age) components.age = age

  const floor = numberComponent(input.specs?.floor)
  if (floor) components.floor = floor

  const project = textComponent(input.specs?.project_name)
  if (project) components.project_name = project

  if (lat !== null && lng !== null) {
    components.coordinates = {
      kind: "coordinates",
      lat,
      lng,
      geohash: encodeGeohash(lat, lng, GEOHASH_PRECISION),
    }
  }

  return {
    identity_version: IDENTITY_VERSION,
    profile_key,
    type: input.type,
    components,
    coordinate_source,
  }
}

export function dnaToProjection(
  dna: PropertyDna,
  area: number,
  city: string,
  district: string
) {
  const coords = dna.components.coordinates
  return {
    identity_version: dna.identity_version,
    profile_key: dna.profile_key,
    type: dna.type,
    city,
    district,
    area,
    latitude: coords?.kind === "coordinates" ? coords.lat : null,
    longitude: coords?.kind === "coordinates" ? coords.lng : null,
    geohash: coords?.kind === "coordinates" ? coords.geohash : null,
    coordinate_source: dna.coordinate_source,
    dna,
  }
}
