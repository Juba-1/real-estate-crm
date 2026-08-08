import { OPPORTUNITY_CANDIDATE_LIMIT } from "@/lib/intelligence/opportunities/config"
import {
  buildRequestDna,
  resolveRequestDistrict,
  type BuildRequestDnaInput,
} from "@/lib/intelligence/identity/request-dna"
import { isNeighborhoodOther } from "@/lib/constants/property-types"
import { createClient } from "@/lib/supabase/server"
import type {
  PropertyCandidate,
  RequestCandidate,
} from "@/lib/intelligence/opportunities/discover"

export async function loadRequestOpportunityCandidates(
  companyId: string,
  filters: {
    type?: string
    city: string
    district?: string
    excludeId?: string | null
  }
): Promise<RequestCandidate[]> {
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select(
      `
      id,
      agent_id,
      type,
      offer_type,
      city,
      neighborhood,
      custom_neighborhood,
      budget_min,
      budget_max,
      area_min,
      area_max,
      details,
      created_at,
      agent:users!requests_agent_id_fkey ( name )
    `
    )
    .eq("company_id", companyId)
    .eq("status", "active")
    .eq("city", filters.city)
    .order("created_at", { ascending: false })
    .limit(OPPORTUNITY_CANDIDATE_LIMIT)

  if (filters.type) {
    query = query.eq("type", filters.type)
  }

  if (filters.excludeId) {
    query = query.neq("id", filters.excludeId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("[opportunities] load requests failed", error)
    return []
  }

  return data
    .map((row) => {
      const district = isNeighborhoodOther(row.neighborhood)
        ? row.custom_neighborhood?.trim() || ""
        : row.neighborhood?.trim() || ""

      if (filters.district && district && filters.district !== district) {
        // Prefer same district but still allow city-wide if no district filter strictness —
        // keep all city matches; district boosts score later.
      }

      const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent

      return {
        id: row.id,
        agent_id: row.agent_id,
        type: row.type,
        offer_type: row.offer_type,
        city: row.city,
        district: district || undefined,
        area_min: row.area_min != null ? Number(row.area_min) : null,
        area_max: row.area_max != null ? Number(row.area_max) : null,
        budget_min: row.budget_min != null ? Number(row.budget_min) : null,
        budget_max: row.budget_max != null ? Number(row.budget_max) : null,
        details: row.details,
        agent_name: agent?.name ?? null,
        created_at: row.created_at,
      }
    })
    .filter(Boolean)
}

export async function loadPropertyOpportunityCandidates(
  companyId: string,
  filters: {
    type?: string
    city: string
    excludeId?: string | null
  }
): Promise<PropertyCandidate[]> {
  const supabase = await createClient()

  let query = supabase
    .from("properties")
    .select(
      `
      id,
      agent_id,
      type,
      offer_type,
      city,
      neighborhood,
      custom_neighborhood,
      area,
      price,
      created_at,
      agent:users!properties_agent_id_fkey ( name )
    `
    )
    .eq("company_id", companyId)
    .eq("status", "available")
    .eq("city", filters.city)
    .order("created_at", { ascending: false })
    .limit(OPPORTUNITY_CANDIDATE_LIMIT)

  if (filters.type) {
    query = query.eq("type", filters.type)
  }

  if (filters.excludeId) {
    query = query.neq("id", filters.excludeId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("[opportunities] load properties failed", error)
    return []
  }

  return data.map((row) => {
    const district = isNeighborhoodOther(row.neighborhood)
      ? row.custom_neighborhood?.trim() || ""
      : row.neighborhood

    const agent = Array.isArray(row.agent) ? row.agent[0] : row.agent

    return {
      id: row.id,
      agent_id: row.agent_id,
      type: row.type,
      offer_type: row.offer_type,
      city: row.city,
      district: district || undefined,
      neighborhood: row.neighborhood,
      area: Number(row.area),
      price: Number(row.price),
      agent_name: agent?.name ?? null,
      created_at: row.created_at,
    }
  })
}

export async function upsertRequestIdentity(
  requestId: string,
  companyId: string,
  input: BuildRequestDnaInput
): Promise<void> {
  try {
    const dna = buildRequestDna(input)
    const district = resolveRequestDistrict(input)
    const supabase = await createClient()

    const { error } = await supabase.from("request_identities").upsert(
      {
        request_id: requestId,
        company_id: companyId,
        identity_version: dna.identity_version,
        profile_key: dna.profile_key,
        type: dna.type,
        offer_type: dna.offer_type,
        city: input.city,
        district: district || "",
        budget_min: input.budget_min ?? null,
        budget_max: input.budget_max ?? null,
        area_min: input.area_min ?? null,
        area_max: input.area_max ?? null,
        dna,
        regenerated_at: new Date().toISOString(),
      },
      { onConflict: "request_id" }
    )

    if (error) {
      console.error("[identity] request upsert failed", error)
    }
  } catch (error) {
    console.error("[identity] request upsert crashed", error)
  }
}
