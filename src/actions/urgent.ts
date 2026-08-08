"use server"

import { createCompanyNotification } from "@/lib/notifications/notify-company"
import { createClient } from "@/lib/supabase/server"
import { isCurrentlyUrgent } from "@/lib/urgent"
import { sendCompanyPushNotification } from "@/lib/push/send-company-push"

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

  const hasConflict = await hasActiveUrgentItem(
    supabase,
    "properties",
    user.id,
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

  const hasConflict = await hasActiveUrgentItem(
    supabase,
    "requests",
    user.id,
    excludeRequestId
  )

  return { hasConflict }
}

/** Reuses existing in-app notification + Web Push infrastructure. No new channel. */
async function notifyCompanyUrgent(
  companyId: string,
  actorUserId: string,
  title: string,
  body: string,
  url: string
): Promise<void> {
  await createCompanyNotification(companyId, title, body, actorUserId)
  await sendCompanyPushNotification(companyId, actorUserId, {
    title,
    body,
    url,
  })
}

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

  const { data: current } = await supabase
    .from("properties")
    .select("urgent_until")
    .eq("id", propertyId)
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

    if (!wasUrgent) {
      const { data: profile } = await supabase
        .from("users")
        .select("company_id, name")
        .eq("id", user.id)
        .maybeSingle()

      if (profile?.company_id) {
        await notifyCompanyUrgent(
          profile.company_id,
          user.id,
          "🚨 عرض مستعجل جديد",
          `قام ${profile.name} بإضافة عرض مستعجل.`,
          "/dashboard/search"
        )
      }
    }

    return null
  }

  if (wasUrgent) {
    const { error: clearError } = await supabase
      .from("properties")
      .update({ urgent_until: null })
      .eq("id", propertyId)
      .eq("agent_id", user.id)

    if (clearError) {
      return { error: clearError.message }
    }
  }

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

  const { data: current } = await supabase
    .from("requests")
    .select("urgent_until")
    .eq("id", requestId)
    .maybeSingle()

  const wasUrgent = isCurrentlyUrgent(current?.urgent_until ?? null)

  if (markUrgent) {
    const { error: rpcError } = await supabase.rpc("activate_urgent_request", {
      p_request_id: requestId,
    })

    if (rpcError) {
      return { error: rpcError.message }
    }

    if (!wasUrgent) {
      const { data: profile } = await supabase
        .from("users")
        .select("company_id, name")
        .eq("id", user.id)
        .maybeSingle()

      if (profile?.company_id) {
        await notifyCompanyUrgent(
          profile.company_id,
          user.id,
          "🚨 طلب مستعجل جديد",
          `قام ${profile.name} بإضافة طلب مستعجل.`,
          "/dashboard/requests"
        )
      }
    }

    return null
  }

  if (wasUrgent) {
    const { error: clearError } = await supabase
      .from("requests")
      .update({ urgent_until: null })
      .eq("id", requestId)
      .eq("agent_id", user.id)

    if (clearError) {
      return { error: clearError.message }
    }
  }

  return null
}
