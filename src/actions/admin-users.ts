"use server"

import { revalidatePath } from "next/cache"

import { resolveAuthEmail } from "@/lib/auth/username"
import { QUOTA_EXCEEDED } from "@/lib/quota"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createCompanyUserSchema,
  updateUserPasswordSchema,
  updateUserRoleSchema,
  type CreateCompanyUserInput,
} from "@/types/admin-user"
import type { UserRole } from "@/types/user"

export type AdminUserActionResult =
  | {
      error: string
      message?: string
    }
  | null

type AdminContext = {
  userId: string
  companyId: string
  role: UserRole
}

async function requireCompanyAdmin(): Promise<
  { error: string } | { context: AdminContext }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to manage users." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return { error: "Your user profile is not set up yet." }
  }

  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { error: "Only company admins can manage users." }
  }

  return {
    context: {
      userId: user.id,
      companyId: profile.company_id,
      role: profile.role,
    },
  }
}

async function getTargetUserInCompany(
  targetUserId: string,
  companyId: string
): Promise<
  | { error: string }
  | { target: { id: string; role: UserRole; company_id: string } }
> {
  const supabase = await createClient()
  const { data: target, error } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", targetUserId)
    .maybeSingle()

  if (error || !target) {
    return { error: "User not found." }
  }

  if (target.company_id !== companyId) {
    return { error: "You can only manage users in your company." }
  }

  return { target }
}

export async function createCompanyUser(
  data: CreateCompanyUserInput
): Promise<AdminUserActionResult> {
  const parsed = createCompanyUserSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid user data. Please check all fields." }
  }

  const adminCheck = await requireCompanyAdmin()
  if ("error" in adminCheck) {
    return { error: adminCheck.error }
  }

  const { context } = adminCheck
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: company, error: companyError },
    { count: userCount, error: userCountError },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("max_agents")
      .eq("id", context.companyId)
      .single(),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", context.companyId)
      .eq("role", "agent"),
  ])

  if (companyError || !company) {
    return { error: companyError?.message ?? "Company not found." }
  }

  if (userCountError) {
    return { error: userCountError.message }
  }

  if ((userCount ?? 0) >= company.max_agents) {
    return {
      error: QUOTA_EXCEEDED,
      message:
        "You have reached the maximum number of agents for your subscription.",
    }
  }

  const authEmail = resolveAuthEmail(parsed.data.username)

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email: authEmail,
      password: parsed.data.password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Failed to create auth user." }
  }

  const { error: profileError } = await supabase.from("users").insert({
    id: authData.user.id,
    company_id: context.companyId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  revalidatePath("/dashboard/admin")
  return null
}

export async function deleteCompanyUser(
  targetUserId: string
): Promise<AdminUserActionResult> {
  if (!targetUserId) {
    return { error: "User is required." }
  }

  const adminCheck = await requireCompanyAdmin()
  if ("error" in adminCheck) {
    return { error: adminCheck.error }
  }

  const { context } = adminCheck

  if (targetUserId === context.userId) {
    return { error: "You cannot delete your own account." }
  }

  const targetCheck = await getTargetUserInCompany(
    targetUserId,
    context.companyId
  )
  if ("error" in targetCheck) {
    return { error: targetCheck.error }
  }

  if (targetCheck.target.role === "super_admin") {
    return { error: "Super admin accounts cannot be deleted from this panel." }
  }

  if (targetCheck.target.role === "admin") {
    const supabase = await createClient()
    const { count, error: adminCountError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", context.companyId)
      .eq("role", "admin")

    if (adminCountError) {
      return { error: adminCountError.message }
    }

    if ((count ?? 0) <= 1) {
      return {
        error:
          "Cannot delete the last office admin. Promote another admin first.",
      }
    }
  }

  const adminClient = createAdminClient()
  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(targetUserId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath("/dashboard/admin")
  return null
}

export async function updateUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<AdminUserActionResult> {
  const parsed = updateUserPasswordSchema.safeParse({
    targetUserId,
    newPassword,
  })

  if (!parsed.success) {
    return { error: "Password must be at least 6 characters." }
  }

  const adminCheck = await requireCompanyAdmin()
  if ("error" in adminCheck) {
    return { error: adminCheck.error }
  }

  const { context } = adminCheck
  const targetCheck = await getTargetUserInCompany(
    parsed.data.targetUserId,
    context.companyId
  )
  if ("error" in targetCheck) {
    return { error: targetCheck.error }
  }

  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    parsed.data.targetUserId,
    { password: parsed.data.newPassword }
  )

  if (updateError) {
    return { error: updateError.message }
  }

  return null
}

async function requireTenantAdminOnly(): Promise<
  { error: string } | { context: AdminContext }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to manage users." }
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
    return { error: "Only company admins can change user roles." }
  }

  return {
    context: {
      userId: user.id,
      companyId: profile.company_id,
      role: profile.role,
    },
  }
}

export async function updateUserRole(
  targetUserId: string,
  newRole: "admin" | "agent"
): Promise<AdminUserActionResult> {
  const parsed = updateUserRoleSchema.safeParse({ targetUserId, newRole })

  if (!parsed.success) {
    return { error: "Invalid role update request." }
  }

  const adminCheck = await requireTenantAdminOnly()
  if ("error" in adminCheck) {
    return { error: adminCheck.error }
  }

  const { context } = adminCheck

  if (parsed.data.targetUserId === context.userId) {
    return { error: "You cannot change your own role." }
  }

  const targetCheck = await getTargetUserInCompany(
    parsed.data.targetUserId,
    context.companyId
  )
  if ("error" in targetCheck) {
    return { error: targetCheck.error }
  }

  if (targetCheck.target.role === "super_admin") {
    return { error: "Super admin accounts cannot be modified from this panel." }
  }

  if (
    targetCheck.target.role !== "admin" &&
    targetCheck.target.role !== "agent"
  ) {
    return { error: "Only admin and agent roles can be assigned here." }
  }

  if (targetCheck.target.role === parsed.data.newRole) {
    return null
  }

  if (targetCheck.target.role === "admin" && parsed.data.newRole === "agent") {
    const supabase = await createClient()
    const { count, error: adminCountError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", context.companyId)
      .eq("role", "admin")

    if (adminCountError) {
      return { error: adminCountError.message }
    }

    if ((count ?? 0) <= 1) {
      return {
        error: "Cannot demote the last office admin. Promote another admin first.",
      }
    }
  }

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from("users")
    .update({ role: parsed.data.newRole })
    .eq("id", parsed.data.targetUserId)
    .eq("company_id", context.companyId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/dashboard/admin")
  return null
}
