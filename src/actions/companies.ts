"use server"

import { revalidatePath } from "next/cache"

import { requireSuperAdmin } from "@/lib/auth/super-admin"
import { resolveAuthEmail } from "@/lib/auth/username"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  onboardNewTenantSchema,
  resetTenantAdminPasswordSchema,
  updateCompanySchema,
  type OnboardNewTenantInput,
  type UpdateCompanyInput,
} from "@/types/company"

export type CompanyActionResult = { error: string } | null

function revalidateCompanyPaths() {
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/companies")
}

export async function onboardNewTenant(
  data: OnboardNewTenantInput
): Promise<CompanyActionResult> {
  const parsed = onboardNewTenantSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid onboarding data. Please check all fields." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()

  // Super Admin onboarding bypasses all tenant quota checks.
  // Use service role for writes so tenant RLS never blocks platform operations.
  const { data: company, error: companyError } = await adminClient
    .from("companies")
    .insert({
      name: parsed.data.companyName,
      is_active: true,
      package_id: parsed.data.packageId,
      max_properties: parsed.data.maxProperties,
      max_agents: parsed.data.maxAgents,
    })
    .select("id")
    .single()

  if (companyError || !company) {
    return { error: companyError?.message ?? "Failed to create company." }
  }

  const authEmail = resolveAuthEmail(parsed.data.adminUsername)

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email: authEmail,
      password: parsed.data.adminPassword,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    await adminClient.from("companies").delete().eq("id", company.id)
    return { error: authError?.message ?? "Failed to create admin auth user." }
  }

  const { error: profileError } = await adminClient.from("users").insert({
    id: authData.user.id,
    company_id: company.id,
    name: parsed.data.adminName,
    phone: parsed.data.adminPhone || null,
    role: "admin",
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    await adminClient.from("companies").delete().eq("id", company.id)
    return { error: profileError.message }
  }

  revalidateCompanyPaths()
  return null
}

export async function updateCompany(
  data: UpdateCompanyInput
): Promise<CompanyActionResult> {
  const parsed = updateCompanySchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid company data. Please check all fields." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from("companies")
    .update({
      name: parsed.data.name,
      package_id: parsed.data.packageId,
      max_properties: parsed.data.maxProperties,
      max_agents: parsed.data.maxAgents,
    })
    .eq("id", parsed.data.companyId)

  if (error) {
    return { error: error.message }
  }

  revalidateCompanyPaths()
  return null
}

export async function resetTenantAdminPassword(
  companyId: string,
  newPassword: string
): Promise<CompanyActionResult> {
  const parsed = resetTenantAdminPasswordSchema.safeParse({
    companyId,
    newPassword,
  })

  if (!parsed.success) {
    return { error: "Invalid password. It must be at least 6 characters." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()

  const { data: tenantAdmin, error: adminLookupError } = await adminClient
    .from("users")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (adminLookupError) {
    return { error: adminLookupError.message }
  }

  if (!tenantAdmin) {
    return { error: "No admin user found for this company." }
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    tenantAdmin.id,
    { password: parsed.data.newPassword }
  )

  if (passwordError) {
    return { error: passwordError.message }
  }

  return null
}

export async function deleteCompany(
  companyId: string
): Promise<CompanyActionResult> {
  if (!companyId) {
    return { error: "Company ID is required." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()

  const { data: companyUsers, error: usersError } = await adminClient
    .from("users")
    .select("id, role")
    .eq("company_id", companyId)

  if (usersError) {
    return { error: usersError.message }
  }

  if (companyUsers?.some((user) => user.role === "super_admin")) {
    return {
      error:
        "لا يمكن حذف الشركة الأساسية لأنها تحتوي على حساب مدير النظام (السوبر أدمن).",
    }
  }

  for (const user of companyUsers ?? []) {
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    )

    if (authDeleteError) {
      return { error: authDeleteError.message }
    }
  }

  const { error: companyDeleteError } = await adminClient
    .from("companies")
    .delete()
    .eq("id", companyId)

  if (companyDeleteError) {
    return { error: companyDeleteError.message }
  }

  revalidateCompanyPaths()
  return null
}

export async function updateCompanyActiveStatus(
  companyId: string,
  isActive: boolean
): Promise<CompanyActionResult> {
  if (!companyId) {
    return { error: "Company ID is required." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("companies")
    .update({ is_active: isActive })
    .eq("id", companyId)

  if (error) {
    return { error: error.message }
  }

  revalidateCompanyPaths()
  return null
}
