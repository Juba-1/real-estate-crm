import "server-only"

import type { createClient } from "@/lib/supabase/server"

export type TenantProfile = {
  company_id: string
  role: string
}

export type ManageableProperty = {
  id: string
  company_id: string
  agent_id: string
}

export type ManageableRequest = {
  id: string
  company_id: string
  agent_id: string
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * App-layer authorization for property mutations.
 * Never rely on RLS alone.
 */
export async function assertCanManageProperty(
  supabase: SupabaseServer,
  userId: string,
  profile: TenantProfile,
  propertyId: string
): Promise<{ error: string } | { property: ManageableProperty }> {
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, company_id, agent_id")
    .eq("id", propertyId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (error || !property) {
    return { error: error?.message ?? "Property not found." }
  }

  const allowed =
    property.agent_id === userId ||
    profile.role === "admin" ||
    profile.role === "super_admin"

  if (!allowed) {
    return { error: "You do not have permission to modify this property." }
  }

  return { property }
}

/**
 * App-layer authorization for request mutations.
 */
export async function assertCanManageRequest(
  supabase: SupabaseServer,
  userId: string,
  profile: TenantProfile,
  requestId: string
): Promise<{ error: string } | { request: ManageableRequest }> {
  const { data: request, error } = await supabase
    .from("requests")
    .select("id, company_id, agent_id")
    .eq("id", requestId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (error || !request) {
    return { error: error?.message ?? "Request not found." }
  }

  const allowed =
    request.agent_id === userId ||
    profile.role === "admin" ||
    profile.role === "super_admin"

  if (!allowed) {
    return { error: "You do not have permission to manage this request." }
  }

  return { request }
}

/**
 * Whether the caller may view confidential edit payload (owners) for a property.
 * Same rules as manage: listing agent or company admin.
 */
export async function assertCanEditProperty(
  supabase: SupabaseServer,
  userId: string,
  profile: TenantProfile,
  propertyId: string
): Promise<{ error: string } | { ok: true }> {
  const result = await assertCanManageProperty(
    supabase,
    userId,
    profile,
    propertyId
  )
  if ("error" in result) {
    return result
  }
  return { ok: true }
}
