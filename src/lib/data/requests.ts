import { createClient } from "@/lib/supabase/server"
import type { ListingAgent } from "@/lib/data/properties"
import type { OfferType, PropertyType } from "@/types/property"
import type { RequestStatus } from "@/types/request"

export type CompanyRequest = {
  id: string
  agent_id: string
  type: PropertyType
  offer_type: OfferType
  city: string
  neighborhood: string | null
  details: string
  status: RequestStatus
  created_at: string
  expires_at: string
  agent: ListingAgent | null
}

export async function getCompanyRequests(): Promise<CompanyRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const { data, error } = await supabase
    .from("requests")
    .select(
      `
      id,
      agent_id,
      type,
      offer_type,
      city,
      neighborhood,
      details,
      status,
      created_at,
      expires_at,
      agent:users!requests_agent_id_fkey (
        name,
        phone
      )
    `
    )
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((request) => ({
    ...request,
    agent: Array.isArray(request.agent)
      ? (request.agent[0] ?? null)
      : request.agent,
  })) as CompanyRequest[]
}
