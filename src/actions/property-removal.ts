"use server"

import { revalidatePath } from "next/cache"

import { assertCanManageProperty } from "@/lib/authz/tenant"
import { notifyCompanyUsers } from "@/lib/notifications/notify-company"
import { createClient } from "@/lib/supabase/server"
import {
  decidePropertyRemovalSchema,
  requestPropertyRemovalSchema,
} from "@/types/property-removal"

export type PropertyRemovalActionResult = { error: string } | null

async function requireTenantProfile() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." } as const
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return {
      error: "Your user profile is not set up yet. Contact your office admin.",
    } as const
  }

  return {
    supabase,
    userId: user.id,
    profile: {
      company_id: profile.company_id as string,
      role: profile.role as string,
      name: profile.name as string,
    },
  } as const
}

/**
 * Agents (and admins) request removal — property stays active until decided.
 */
export async function requestPropertyRemoval(
  input: unknown
): Promise<PropertyRemovalActionResult> {
  const parsed = requestPropertyRemovalSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Invalid removal request. Choose a reason." }
  }

  const auth = await requireTenantProfile()
  if ("error" in auth) {
    return { error: auth.error ?? "Unauthorized." }
  }

  const { supabase, userId, profile } = auth
  const access = await assertCanManageProperty(
    supabase,
    userId,
    profile,
    parsed.data.propertyId
  )
  if ("error" in access) {
    return access
  }

  // Agents may only request for their own listings; admins may request any in company.
  if (
    profile.role !== "admin" &&
    profile.role !== "super_admin" &&
    access.property.agent_id !== userId
  ) {
    return { error: "You can only request removal for your own properties." }
  }

  const { error: insertError } = await supabase
    .from("property_removal_requests")
    .insert({
      company_id: profile.company_id,
      property_id: parsed.data.propertyId,
      requested_by: userId,
      reason_key: parsed.data.reasonKey,
      reason_detail: parsed.data.reasonDetail?.trim() || null,
      status: "pending",
    })

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "A removal request is already pending for this property." }
    }
    return { error: insertError.message }
  }

  const { data: admins } = await supabase
    .from("users")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("role", "admin")

  const adminIds = (admins ?? []).map((row) => row.id).filter((id) => id !== userId)

  if (adminIds.length > 0) {
    await notifyCompanyUsers({
      actorUserId: userId,
      companyId: profile.company_id,
      recipientUserIds: adminIds,
      title: "طلب إزالة عقار",
      message: `${profile.name} طلب إزالة عقار. راجع الطلبات المعلقة.`,
      linkPath: "/dashboard/removals",
    })
  }

  revalidatePath("/dashboard/my-properties")
  revalidatePath("/dashboard/removals")
  return null
}

/**
 * Admin-only decision: approve (hard delete), reject, or archive instead.
 */
export async function decidePropertyRemoval(
  input: unknown
): Promise<PropertyRemovalActionResult> {
  const parsed = decidePropertyRemovalSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Invalid decision." }
  }

  const auth = await requireTenantProfile()
  if ("error" in auth) {
    return { error: auth.error ?? "Unauthorized." }
  }

  const { supabase, userId, profile } = auth

  if (profile.role !== "admin") {
    return { error: "Only office admins can decide removal requests." }
  }

  const { data: request, error: loadError } = await supabase
    .from("property_removal_requests")
    .select("id, property_id, requested_by, status, company_id")
    .eq("id", parsed.data.requestId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (loadError || !request) {
    return { error: loadError?.message ?? "Removal request not found." }
  }

  if (request.status !== "pending") {
    return { error: "This request was already decided." }
  }

  const now = new Date().toISOString()
  const decisionNote = parsed.data.decisionNote?.trim() || null

  if (parsed.data.decision === "reject") {
    const { error: updateError } = await supabase
      .from("property_removal_requests")
      .update({
        status: "rejected",
        decided_by: userId,
        decided_at: now,
        decision_note: decisionNote,
      })
      .eq("id", request.id)
      .eq("company_id", profile.company_id)

    if (updateError) {
      return { error: updateError.message }
    }

    await notifyCompanyUsers({
      actorUserId: userId,
      companyId: profile.company_id,
      recipientUserIds: [request.requested_by],
      title: "تم رفض طلب الإزالة",
      message: decisionNote
        ? `رفض المدير طلب إزالة العقار. ملاحظة: ${decisionNote}`
        : "رفض المدير طلب إزالة العقار. العقار ما زال نشطاً.",
      linkPath: "/dashboard/my-properties",
    })

    revalidatePath("/dashboard/removals")
    revalidatePath("/dashboard/my-properties")
    return null
  }

  if (parsed.data.decision === "archive") {
    if (!request.property_id) {
      return { error: "Property no longer exists." }
    }

    const { error: archiveError } = await supabase
      .from("properties")
      .update({
        status: "archived",
        status_updated_at: now,
      })
      .eq("id", request.property_id)
      .eq("company_id", profile.company_id)

    if (archiveError) {
      return { error: archiveError.message }
    }

    const { error: updateError } = await supabase
      .from("property_removal_requests")
      .update({
        status: "archived_instead",
        decided_by: userId,
        decided_at: now,
        decision_note: decisionNote,
      })
      .eq("id", request.id)
      .eq("company_id", profile.company_id)

    if (updateError) {
      return { error: updateError.message }
    }

    await notifyCompanyUsers({
      actorUserId: userId,
      companyId: profile.company_id,
      recipientUserIds: [request.requested_by],
      title: "تمت أرشفة العقار",
      message: decisionNote
        ? `أرشف المدير العقار بدلاً من حذفه. ملاحظة: ${decisionNote}`
        : "أرشف المدير العقار بدلاً من حذفه. يبقى في السجلات للتقارير.",
      linkPath: "/dashboard/my-properties",
    })

    revalidatePath("/dashboard/removals")
    revalidatePath("/dashboard/my-properties")
    revalidatePath("/dashboard/search")
    revalidatePath("/dashboard")
    return null
  }

  // approve → hard delete (admin-only path)
  if (!request.property_id) {
    return { error: "Property no longer exists." }
  }

  const { error: deleteError } = await supabase
    .from("properties")
    .delete()
    .eq("id", request.property_id)
    .eq("company_id", profile.company_id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  const { error: updateError } = await supabase
    .from("property_removal_requests")
    .update({
      status: "approved",
      decided_by: userId,
      decided_at: now,
      decision_note: decisionNote,
      property_id: null,
    })
    .eq("id", request.id)
    .eq("company_id", profile.company_id)

  if (updateError) {
    console.error("[removal] decision row update failed after delete", updateError.message)
  }

  await notifyCompanyUsers({
    actorUserId: userId,
    companyId: profile.company_id,
    recipientUserIds: [request.requested_by],
    title: "تمت الموافقة على الإزالة",
    message: decisionNote
      ? `وافق المدير على حذف العقار. ملاحظة: ${decisionNote}`
      : "وافق المدير على حذف العقار.",
    linkPath: "/dashboard/my-properties",
  })

  revalidatePath("/dashboard/removals")
  revalidatePath("/dashboard/my-properties")
  revalidatePath("/dashboard/search")
  revalidatePath("/dashboard")
  return null
}
