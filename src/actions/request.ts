"use server"

import { revalidatePath } from "next/cache"

import { applyRequestUrgentIntent } from "@/actions/urgent"
import { suggestFromListingFields } from "@/actions/dictionary"
import { persistRequestIdentityAfterSave } from "@/actions/intelligence/identity"
import { notifyOpportunityDiscovery } from "@/actions/intelligence/opportunities"
import { assertCanManageRequest } from "@/lib/authz/tenant"
import { localizeDashboardPath } from "@/lib/notifications/localize-path"
import { notifyCompanyUsers } from "@/lib/notifications/notify-company"
import { createClient } from "@/lib/supabase/server"
import { EASTERN_CITY_NAMES } from "@/lib/constants/locations"
import { isNeighborhoodOther, isPropertyTypeOther, PROPERTY_TYPE_VALUES } from "@/lib/constants/property-types"
import { formatPropertyType } from "@/lib/property-utils"
import { sendCompanyPushNotification } from "@/lib/push/send-company-push"
import { getLocale } from "next-intl/server"
import {
  insertRequestSchema,
  type InsertRequestInput,
  type ManageRequestAction,
} from "@/types/request"

export type RequestActionResult = {
  error: string
} | null

export async function addRequest(
  data: InsertRequestInput
): Promise<RequestActionResult> {
  const parsed = insertRequestSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid request data. Please check all fields." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to post a request." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return {
      error:
        "Your user profile is not set up yet. Contact your office admin.",
    }
  }

  const { data: request, error: insertError } = await supabase
    .from("requests")
    .insert({
      company_id: profile.company_id,
      agent_id: user.id,
      type: parsed.data.type,
      custom_property_type: parsed.data.custom_property_type?.trim() || null,
      offer_type: parsed.data.offer_type,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood || null,
      custom_neighborhood: parsed.data.custom_neighborhood?.trim() || null,
      details: parsed.data.details,
      budget_min: parsed.data.budget_min ?? null,
      budget_max: parsed.data.budget_max ?? null,
      area_min: parsed.data.area_min ?? null,
      area_max: parsed.data.area_max ?? null,
    })
    .select("id")
    .single()

  if (insertError || !request) {
    return { error: insertError?.message ?? "Failed to save the request." }
  }

  if (parsed.data.mark_urgent) {
    const urgentResult = await applyRequestUrgentIntent(request.id, true)
    if (urgentResult?.error) {
      console.error("[urgent] activate on create failed", {
        requestId: request.id,
        error: urgentResult.error,
      })
    }
  }

  void suggestFromListingFields({
    type: parsed.data.type,
    custom_property_type: parsed.data.custom_property_type,
    city: parsed.data.city,
    neighborhood: parsed.data.neighborhood,
    custom_neighborhood: parsed.data.custom_neighborhood,
    builtInCities: EASTERN_CITY_NAMES,
    builtInPropertyTypes: PROPERTY_TYPE_VALUES,
    isNeighborhoodOther,
    isPropertyTypeOther,
  })

  void persistRequestIdentityAfterSave(
    request.id,
    profile.company_id,
    parsed.data
  )

  void notifyOpportunityDiscovery({
    trigger: "request_saved",
    companyId: profile.company_id,
    actorUserId: user.id,
    request: {
      id: request.id,
      type: parsed.data.type,
      offer_type: parsed.data.offer_type,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood,
      custom_neighborhood: parsed.data.custom_neighborhood,
      budget_min: parsed.data.budget_min,
      budget_max: parsed.data.budget_max,
      area_min: parsed.data.area_min,
      area_max: parsed.data.area_max,
    },
  })

  const requestType = isPropertyTypeOther(parsed.data.type)
    ? parsed.data.custom_property_type?.trim() ||
      formatPropertyType(parsed.data.type)
    : formatPropertyType(parsed.data.type)

  const neighborhood = isNeighborhoodOther(parsed.data.neighborhood)
    ? parsed.data.custom_neighborhood?.trim() || parsed.data.city
    : parsed.data.neighborhood?.trim() || parsed.data.city

  const notificationTitle = "طلب عقاري جديد"
  const notificationBody = `تم إضافة طلب جديد: ${requestType} في ${neighborhood}`
  const requestsPath = "/dashboard/requests"

  void (async () => {
    const locale = await getLocale()
    const pushUrl = localizeDashboardPath(locale, requestsPath)

    await notifyCompanyUsers({
      actorUserId: user.id,
      companyId: profile.company_id,
      title: notificationTitle,
      message: notificationBody,
      linkPath: requestsPath,
      excludeActor: true,
    })

    await sendCompanyPushNotification(profile.company_id, user.id, {
      title: notificationTitle,
      body: notificationBody,
      url: pushUrl,
    })
  })()

  revalidatePath("/dashboard/requests")
  return null
}

export async function manageRequest(
  requestId: string,
  actionType: ManageRequestAction
): Promise<RequestActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to manage requests." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role")
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
    profile,
    requestId
  )
  if ("error" in access) {
    return access
  }

  if (actionType === "renew") {
    const renewedExpiry = new Date()
    renewedExpiry.setDate(renewedExpiry.getDate() + 14)

    const { error } = await supabase
      .from("requests")
      .update({
        expires_at: renewedExpiry.toISOString(),
        status: "active",
      })
      .eq("id", requestId)
      .eq("company_id", profile.company_id)

    if (error) {
      return { error: error.message }
    }
  }

  if (actionType === "execute") {
    const { error } = await supabase
      .from("requests")
      .update({ status: "executed" })
      .eq("id", requestId)
      .eq("company_id", profile.company_id)

    if (error) {
      return { error: error.message }
    }
  }

  if (actionType === "archive") {
    const { error } = await supabase
      .from("requests")
      .update({ status: "archived" })
      .eq("id", requestId)
      .eq("company_id", profile.company_id)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/dashboard/requests")
  return null
}
