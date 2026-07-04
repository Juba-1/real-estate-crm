"use server"

import { revalidatePath } from "next/cache"

import { requireSuperAdmin } from "@/lib/auth/super-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createPackageSchema,
  updatePackageSchema,
  type CreatePackageInput,
  type UpdatePackageInput,
} from "@/types/package"

export type PackageActionResult = { error: string } | null

function revalidatePackagePaths() {
  revalidatePath("/super-admin/packages")
  revalidatePath("/super-admin/companies")
}

export async function createPackage(
  data: CreatePackageInput
): Promise<PackageActionResult> {
  const parsed = createPackageSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid package data. Please check all fields." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from("packages").insert({
    name: parsed.data.name,
    max_properties: parsed.data.maxProperties,
    max_agents: parsed.data.maxAgents,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePackagePaths()
  return null
}

export async function updatePackage(
  data: UpdatePackageInput
): Promise<PackageActionResult> {
  const parsed = updatePackageSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid package data. Please check all fields." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("packages")
    .update({
      name: parsed.data.name,
      max_properties: parsed.data.maxProperties,
      max_agents: parsed.data.maxAgents,
    })
    .eq("id", parsed.data.packageId)

  if (error) {
    return { error: error.message }
  }

  revalidatePackagePaths()
  return null
}

export async function deletePackage(
  packageId: string
): Promise<PackageActionResult> {
  if (!packageId) {
    return { error: "Package ID is required." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()

  const { count, error: usageError } = await adminClient
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("package_id", packageId)

  if (usageError) {
    return { error: usageError.message }
  }

  if ((count ?? 0) > 0) {
    return {
      error: "Cannot delete a package that is assigned to one or more companies.",
    }
  }

  const { error } = await adminClient
    .from("packages")
    .delete()
    .eq("id", packageId)

  if (error) {
    return { error: error.message }
  }

  revalidatePackagePaths()
  return null
}
