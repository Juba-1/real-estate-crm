import { requireSuperAdmin } from "@/lib/auth/super-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { CompanyRow } from "@/types/company"

export type SuperAdminStats = {
  totalCompanies: number
  totalUsers: number
  totalProperties: number
}

export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    throw new Error(auth.error)
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { count: totalCompanies, error: companiesError },
    { count: totalUsers, error: usersError },
    { count: totalProperties, error: propertiesError },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("role", ["admin", "agent"]),
    adminClient.from("properties").select("*", { count: "exact", head: true }),
  ])

  if (companiesError) {
    throw new Error(companiesError.message)
  }

  if (usersError) {
    throw new Error(usersError.message)
  }

  if (propertiesError) {
    throw new Error(propertiesError.message)
  }

  return {
    totalCompanies: totalCompanies ?? 0,
    totalUsers: totalUsers ?? 0,
    totalProperties: totalProperties ?? 0,
  }
}

export async function getAllCompanies(): Promise<CompanyRow[]> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    throw new Error(auth.error)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("companies")
    .select("id, name, is_active, package_id, max_properties, max_agents, logo_url, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getRecentCompanies(limit = 5): Promise<CompanyRow[]> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    throw new Error(auth.error)
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("companies")
    .select("id, name, is_active, package_id, max_properties, max_agents, logo_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}
