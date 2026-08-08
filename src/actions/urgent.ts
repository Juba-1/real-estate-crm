"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { assertCanManageProperty, assertCanManageRequest } from "@/lib/authz/tenant"
import {
  notifyCompanyUsers,
} from "@/lib/notifications/notify-company"
import { localizeDashboardPath } from "@/lib/notifications/localize-path"
import { sendCompanyPushNotification } from "@/lib/push/send-company-push"
import { createClient } from "@/lib/supabase/server"
import { isCurrentlyUrgent } from "@/lib/urgent"

export type UrgentConflictResult = {
  hasConflict: boolean
}

export type UrgentApplyResult = {
  error: string
} | null

type UrgentTable = "properties" | "requests"

async function hasActiveUrgentItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: UrgentTable,
  agentId: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select("id")
    .eq("agent_id", agentId)
    .not("urgent_until", "is", null)
    .gt("urgent_until", new Date().toISOString())
    .limit(1)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data } = await query.maybeSingle()
  return Boolean(data)
}

/**
 * Conflict check for the listing owner's urgent slot (not always the caller).
 * When excludePropertyId is set, uses that property's agent_id.
 */
export async function checkUrgentPropertyConflict(
  excludePropertyId?: string
): Promise<UrgentConflictResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { hasConflict: false }
  }

  let agentId = user.id

  if (excludePropertyId) {
    const { data: property } = await supabase
      .from("properties")
      .select("agent_id")
      .eq("id", excludePropertyId)
      .maybeSingle()

    if (property?.agent_id) {
      agentId = property.agent_id
    }
  }

  const hasConflict = await hasActiveUrgentItem(
    supabase,
    "properties",
    agentId,
    excludePropertyId
  )

  return { hasConflict }
}

export async function checkUrgentRequestConflict(
  excludeRequestId?: string
): Promise<UrgentConflictResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { hasConflict: false }
  }

  let agentId = user.id

  if (excludeRequestId) {
    const { data: request } = await supabase
      .from("requests")
      .select("agent_id")
      .eq("id", excludeRequestId)
      .maybeSingle()

    if (request?.agent_id) {
      agentId = request.agent_id
    }
  }

  const hasConflict = await hasActiveUrgentItem(
    supabase,
    "requests",
    agentId,
    excludeRequestId
  )

  return { hasConflict }
}

function fireUrgentNotify(params: {
  companyId: string
  actorUserId: string
  actorName: string
  entity: "property" | "request"
  locale: string
}): void {
  const isProperty = params.entity === "property"
  const title = isProperty ? "🚨 عرض مستعجل جديد" : "🚨 طلب مستعجل جديد"
  const message = isProperty
    ? `قام ${params.actorName} بإضافة عرض مستعجل.`
    : `قام ${params.actorName} بإضافة طلب مستعجل.`
  const linkPath = localizeDashboardPath(
    params.locale,
    isProperty ? "/dashboard/search" : "/dashboard/requests"
  )

  void notifyCompanyUsers({
    actorUserId: params.actorUserId,
    companyId: params.companyId,
    title,
    message,
    linkPath,
    excludeActor: true,
  }).then(() =>
    sendCompanyPushNotification(params.companyId, params.actorUserId, {
      title,
      body: message,
      url: linkPath,
    })
  )
}

function revalidateUrgentPaths(entity: "property" | "request"): void {
  revalidatePath("/dashboard")
  if (entity === "property") {
    revalidatePath("/dashboard/my-properties")
    revalidatePath("/dashboard/search")
  } else {
    revalidatePath("/dashboard/requests")
  }
}

/**
 * Shared apply used by create/update forms and card toggles.
 * App-layer authz required; RPC/admin-aware clear after bind.
 */
export async function applyPropertyUrgentIntent(
  propertyId: string,
  markUrgent: boolean
): Promise<UrgentApplyResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update urgent status." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return {
      error:
        "Your user profile is not set up yet. Contact your office admin.",
    }
  }

  const access = await assertCanManageProperty(
    supabase,
    user.id,
    { company_id: profile.company_id, role: profile.role },
    propertyId
  )
  if ("error" in access) {
    return access
  }

  const { data: current } = await supabase
    .from("properties")
    .select("urgent_until")
    .eq("id", propertyId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  const wasUrgent = isCurrentlyUrgent(current?.urgent_until ?? null)

  if (markUrgent) {
    const { error: rpcError } = await supabase.rpc(
      "activate_urgent_property",
      { p_property_id: propertyId }
    )

    if (rpcError) {
      return { error: rpcError.message }
    }

    const { data: verified } = await supabase
      .from("properties")
      .select("urgent_until")
      .eq("id", propertyId)
      .maybeSingle()

    if (!isCurrentlyUrgent(verified?.urgent_until ?? null)) {
      return {
        error:
          "Could not activate urgent status. You may not have permission for this listing.",
      }
    }

    if (!wasUrgent) {
      const locale = await getLocale()
      fireUrgentNotify({
        companyId: profile.company_id,
        actorUserId: user.id,
        actorName: profile.name ?? "Agent",
        entity: "property",
        locale,
      })
    }

    revalidateUrgentPaths("property")
    return null
  }

  if (wasUrgent) {
    const { error: clearError } = await supabase
      .from("properties")
      .update({ urgent_until: null })
      .eq("id", propertyId)
      .eq("company_id", profile.company_id)

    if (clearError) {
      return { error: clearError.message }
    }
  }

  revalidateUrgentPaths("property")
  return null
}

export async function applyRequestUrgentIntent(
  requestId: string,
  markUrgent: boolean
): Promise<UrgentApplyResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update urgent status." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return {
      error:
        "Your user profile is not set up yet. Contact your office admin.",
    }
  }

  const access = await assertCanManageRequest(
    supabase,
    user.id,
    { company_id: profile.company_id, role: profile.role },
    requestId
  )
  if ("error" in access) {
    return access
  }

  const { data: current } = await supabase
    .from("requests")
    .select("urgent_until")
    .eq("id", requestId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  const wasUrgent = isCurrentlyUrgent(current?.urgent_until ?? null)

  if (markUrgent) {
    const { error: rpcError } = await supabase.rpc("activate_urgent_request", {
      p_request_id: requestId,
    })

    if (rpcError) {
      return { error: rpcError.message }
    }

    const { data: verified } = await supabase
      .from("requests")
      .select("urgent_until")
      .eq("id", requestId)
      .maybeSingle()

    if (!isCurrentlyUrgent(verified?.urgent_until ?? null)) {
      return {
        error:
          "Could not activate urgent status. You may not have permission for this request.",
      }
    }

    if (!wasUrgent) {
      const locale = await getLocale()
      fireUrgentNotify({
        companyId: profile.company_id,
        actorUserId: user.id,
        actorName: profile.name ?? "Agent",
        entity: "request",
        locale,
      })
    }

    revalidateUrgentPaths("request")
    return null
  }

  if (wasUrgent) {
    const { error: clearError } = await supabase
      .from("requests")
      .update({ urgent_until: null })
      .eq("id", requestId)
      .eq("company_id", profile.company_id)

    if (clearError) {
      return { error: clearError.message }
    }
  }

  revalidateUrgentPaths("request")
  return null
}

/** Card / quick-action wrappers — same authz as apply*. */
export async function setPropertyUrgent(
  propertyId: string,
  markUrgent: boolean
): Promise<UrgentApplyResult> {
  return applyPropertyUrgentIntent(propertyId, markUrgent)
}

export async function setRequestUrgent(
  requestId: string,
  markUrgent: boolean
): Promise<UrgentApplyResult> {
  return applyRequestUrgentIntent(requestId, markUrgent)
}
