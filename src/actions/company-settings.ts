"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type CompanySettingsActionResult = { error: string } | null

async function requireTenantAdmin(): Promise<
  { error: string } | { companyId: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to manage office settings." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return { error: "Your user profile is not set up yet." }
  }

  if (profile.role !== "admin") {
    return { error: "Only company admins can manage office settings." }
  }

  return { companyId: profile.company_id }
}

export async function updateCompanyLogo(
  logoUrl: string
): Promise<CompanySettingsActionResult> {
  const trimmedUrl = logoUrl.trim()

  if (!trimmedUrl) {
    return { error: "Logo URL is required." }
  }

  try {
    new URL(trimmedUrl)
  } catch {
    return { error: "Invalid logo URL." }
  }

  const adminCheck = await requireTenantAdmin()
  if ("error" in adminCheck) {
    return { error: adminCheck.error }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("companies")
    .update({ logo_url: trimmedUrl })
    .eq("id", adminCheck.companyId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")
  return null
}
