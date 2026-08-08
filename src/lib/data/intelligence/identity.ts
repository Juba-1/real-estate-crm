import {
  buildAreaBand,
  candidateLimit,
  geohashPrefixFromDna,
} from "@/lib/intelligence/identity/candidates"
import {
  buildPropertyDna,
  dnaToProjection,
  resolveDistrict,
  type BuildDnaInput,
  type CandidateDnaRow,
} from "@/lib/intelligence/identity"
import { isNeighborhoodOther } from "@/lib/constants/property-types"
import { createClient } from "@/lib/supabase/server"
import type { PropertyDna } from "@/types/intelligence/identity"

function parseDna(raw: unknown): PropertyDna | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  return raw as PropertyDna
}

export async function loadIdentityCandidates(
  companyId: string,
  input: BuildDnaInput,
  excludePropertyId?: string | null
): Promise<CandidateDnaRow[]> {
  const dna = buildPropertyDna(input)
  const district = resolveDistrict(input)
  const areaBand = buildAreaBand(input.area)
  const prefix = geohashPrefixFromDna(dna)
  const limit = candidateLimit()
  const supabase = await createClient()

  let identityQuery = supabase
    .from("property_identities")
    .select("property_id, type, city, district, area, dna, geohash")
    .eq("company_id", companyId)
    .eq("profile_key", dna.profile_key)
    .eq("city", input.city)
    .eq("district", district)
    .gte("area", areaBand.min)
    .lte("area", areaBand.max)
    .limit(limit)

  if (excludePropertyId) {
    identityQuery = identityQuery.neq("property_id", excludePropertyId)
  }

  if (prefix) {
    identityQuery = identityQuery.like("geohash", `${prefix}%`)
  }

  const { data: identityRows, error: identityError } = await identityQuery

  if (identityError) {
    console.error("[identity] candidate identities failed", identityError)
  }

  const fromIdentities: CandidateDnaRow[] = []
  const seen = new Set<string>()
  const identityIds: string[] = []

  for (const row of identityRows ?? []) {
    const parsed = parseDna(row.dna)
    if (!parsed) {
      continue
    }
    seen.add(row.property_id)
    identityIds.push(row.property_id)
    fromIdentities.push({
      property_id: row.property_id,
      dna: parsed,
      type: row.type,
      city: row.city,
      district: row.district,
      area: Number(row.area),
      agent_name: null,
      created_at: new Date(0).toISOString(),
    })
  }

  if (identityIds.length > 0) {
    const { data: meta } = await supabase
      .from("properties")
      .select(
        `
        id,
        created_at,
        agent:users!properties_agent_id_fkey ( name )
      `
      )
      .eq("company_id", companyId)
      .in("id", identityIds)

    const byId = new Map(
      (meta ?? []).map((row) => {
        const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent
        return [row.id, { created_at: row.created_at, name: agent?.name ?? null }]
      })
    )

    for (const candidate of fromIdentities) {
      const info = byId.get(candidate.property_id)
      if (info) {
        candidate.created_at = info.created_at
        candidate.agent_name = info.name
      }
    }
  }

  const remaining = limit - fromIdentities.length
  if (remaining <= 0) {
    return fromIdentities
  }

  let propsQuery = supabase
    .from("properties")
    .select(
      `
      id,
      type,
      city,
      neighborhood,
      custom_neighborhood,
      area,
      plot_letter,
      google_maps_url,
      specs,
      created_at,
      agent:users!properties_agent_id_fkey ( name )
    `
    )
    .eq("company_id", companyId)
    .eq("type", input.type)
    .eq("city", input.city)
    .gte("area", areaBand.min)
    .lte("area", areaBand.max)
    .limit(remaining * 2)

  if (excludePropertyId) {
    propsQuery = propsQuery.neq("id", excludePropertyId)
  }

  const { data: props, error: propsError } = await propsQuery

  if (propsError) {
    console.error("[identity] candidate properties failed", propsError)
    return fromIdentities
  }

  for (const property of props ?? []) {
    if (seen.has(property.id)) {
      continue
    }

    const propDistrict = isNeighborhoodOther(property.neighborhood)
      ? property.custom_neighborhood?.trim() || property.neighborhood
      : property.neighborhood

    if (propDistrict !== district) {
      continue
    }

    const specs =
      property.specs && typeof property.specs === "object"
        ? (property.specs as BuildDnaInput["specs"])
        : {}

    const candidateDna = buildPropertyDna({
      type: property.type,
      city: property.city,
      neighborhood: property.neighborhood,
      custom_neighborhood: property.custom_neighborhood,
      area: Number(property.area),
      plot_letter: property.plot_letter,
      google_maps_url: property.google_maps_url,
      specs,
    })

    const agent = Array.isArray(property.agent)
      ? property.agent[0]
      : property.agent

    fromIdentities.push({
      property_id: property.id,
      dna: candidateDna,
      type: property.type,
      city: property.city,
      district: propDistrict,
      area: Number(property.area),
      agent_name: agent?.name ?? null,
      created_at: property.created_at,
    })
    seen.add(property.id)

    if (fromIdentities.length >= limit) {
      break
    }
  }

  return fromIdentities
}

export async function upsertPropertyIdentity(
  propertyId: string,
  companyId: string,
  input: BuildDnaInput
): Promise<void> {
  try {
    const dna = buildPropertyDna(input)
    const district = resolveDistrict(input)
    const projection = dnaToProjection(dna, input.area, input.city, district)
    const supabase = await createClient()

    const { error } = await supabase.from("property_identities").upsert(
      {
        property_id: propertyId,
        company_id: companyId,
        identity_version: projection.identity_version,
        profile_key: projection.profile_key,
        type: projection.type,
        city: projection.city,
        district: projection.district,
        area: projection.area,
        latitude: projection.latitude,
        longitude: projection.longitude,
        geohash: projection.geohash,
        coordinate_source: projection.coordinate_source,
        dna: projection.dna,
        regenerated_at: new Date().toISOString(),
      },
      { onConflict: "property_id" }
    )

    if (error) {
      console.error("[identity] upsert failed", error)
    }
  } catch (error) {
    console.error("[identity] upsert crashed", error)
  }
}
