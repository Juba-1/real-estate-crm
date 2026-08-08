import { createClient } from "@/lib/supabase/server"
import type { ListingAgent } from "@/lib/data/properties"
import { parsePage, type PaginatedResult } from "@/lib/pagination"
import { compareByUrgency } from "@/lib/urgent"
import type { OfferType, PropertyType } from "@/types/property"
import type { RequestStatus } from "@/types/request"

export type CompanyRequest = {
  id: string
  agent_id: string
  type: PropertyType
  custom_property_type: string | null
  offer_type: OfferType
  city: string
  neighborhood: string | null
  details: string
  status: RequestStatus
  created_at: string
  expires_at: string
  urgent_until: string | null
  agent: ListingAgent | null
}

export async function getCompanyRequests(
  pageParams: { page?: string | string[]; pageSize?: string | string[] } = {}
): Promise<PaginatedResult<CompanyRequest>> {
  const empty: PaginatedResult<CompanyRequest> = {
    items: [],
    page: 1,
    pageSize: 24,
    total: 0,
    hasMore: false,
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return empty
  }

  const { page, pageSize, from, to } = parsePage(pageParams)

  const { data, error, count } = await supabase
    .from("requests")
    .select(
      `
      id,
      agent_id,
      type,
      custom_property_type,
      offer_type,
      city,
      neighborhood,
      details,
      status,
      created_at,
      expires_at,
      urgent_until,
      agent:users!requests_agent_id_fkey (
        name,
        phone
      )
    `,
      { count: "exact" }
    )
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .order("urgent_until", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error || !data) {
    return { ...empty, page, pageSize }
  }

  const items = data.map((request) => ({
    ...request,
    agent: Array.isArray(request.agent)
      ? (request.agent[0] ?? null)
      : request.agent,
  })) as CompanyRequest[]

  const total = count ?? items.length
  return {
    items: items.sort(compareByUrgency),
    page,
    pageSize,
    total,
    hasMore: from + items.length < total,
  }
}
