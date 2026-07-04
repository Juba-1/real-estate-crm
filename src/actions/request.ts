"use server"

import { revalidatePath } from "next/cache"

import { createCompanyNotification } from "@/actions/notifications"
import { createClient } from "@/lib/supabase/server"
import { isNeighborhoodOther, isPropertyTypeOther } from "@/lib/constants/property-types"
import { formatPropertyType } from "@/lib/property-utils"
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

  const { error: insertError } = await supabase.from("requests").insert({
    company_id: profile.company_id,
    agent_id: user.id,
    type: parsed.data.type,
    custom_property_type: parsed.data.custom_property_type?.trim() || null,
    offer_type: parsed.data.offer_type,
    city: parsed.data.city,
    neighborhood: parsed.data.neighborhood || null,
    custom_neighborhood: parsed.data.custom_neighborhood?.trim() || null,
    details: parsed.data.details,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  const requestType = isPropertyTypeOther(parsed.data.type)
    ? parsed.data.custom_property_type?.trim() ||
      formatPropertyType(parsed.data.type)
    : formatPropertyType(parsed.data.type)

  const neighborhood = isNeighborhoodOther(parsed.data.neighborhood)
    ? parsed.data.custom_neighborhood?.trim() || parsed.data.city
    : parsed.data.neighborhood?.trim() || parsed.data.city

  await createCompanyNotification(
    profile.company_id,
    "طلب عقاري جديد",
    `تم إضافة طلب جديد: ${requestType} في ${neighborhood}`
  )

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

    if (error) {
      return { error: error.message }
    }
  }

  if (actionType === "execute") {
    const { error } = await supabase
      .from("requests")
      .update({ status: "executed" })
      .eq("id", requestId)

    if (error) {
      return { error: error.message }
    }
  }

  if (actionType === "archive") {
    const { error } = await supabase
      .from("requests")
      .update({ status: "archived" })
      .eq("id", requestId)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/dashboard/requests")
  return null
}
