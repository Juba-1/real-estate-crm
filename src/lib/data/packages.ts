import { requireSuperAdmin } from "@/lib/auth/super-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PackageRow } from "@/types/package"

const PACKAGE_SELECT =
  "id, name, max_properties, max_agents, created_at" as const

const DEFAULT_PACKAGES = [
  { name: "الباقة الأساسية", max_properties: 50, max_agents: 3 },
  { name: "الباقة المتقدمة", max_properties: 200, max_agents: 10 },
  { name: "الباقة اللامحدودة", max_properties: 9999, max_agents: 99 },
] as const

async function fetchPackages(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<PackageRow[]> {
  const { data, error } = await adminClient
    .from("packages")
    .select(PACKAGE_SELECT)
    .order("max_properties", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

async function seedDefaultPackages(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<PackageRow[]> {
  const { error: seedError } = await adminClient
    .from("packages")
    .insert([...DEFAULT_PACKAGES])

  if (seedError) {
    throw new Error(seedError.message)
  }

  return fetchPackages(adminClient)
}

export async function getAllPackages(): Promise<PackageRow[]> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    throw new Error(auth.error)
  }

  const adminClient = createAdminClient()
  const packages = await fetchPackages(adminClient)

  if (packages.length === 0) {
    return seedDefaultPackages(adminClient)
  }

  return packages
}

/** Read-only package list for the public marketing page (server-side service role). */
export async function getPublicPackages(): Promise<PackageRow[]> {
  const adminClient = createAdminClient()

  try {
    return await fetchPackages(adminClient)
  } catch {
    return []
  }
}
