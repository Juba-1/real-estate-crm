"use server"

import { revalidatePath } from "next/cache"
import { redirectTo } from "@/i18n/server-redirect"
import { isRedirectError } from "next/dist/client/components/redirect-error"

import { createCompanyNotification } from "@/actions/notifications"
import { createClient } from "@/lib/supabase/server"
import { isNeighborhoodOther, isPropertyTypeOther } from "@/lib/constants/property-types"
import { formatPropertyType } from "@/lib/property-utils"
import { sendCompanyPushNotification } from "@/lib/push/send-company-push"
import { QUOTA_EXCEEDED } from "@/lib/quota"
import {
  insertPropertySchema,
  updatePropertySchema,
  type InsertPropertyInput,
  type UpdatePropertyInput,
} from "@/types/property"

export type AddPropertyResult =
  | {
      error: string
      message?: string
    }
  | null

function buildSpecsPayload(specs: InsertPropertyInput["specs"]) {
  const payload: Record<string, string | number> = {}

  if (specs.rooms !== undefined) {
    payload.rooms = specs.rooms
  }

  if (specs.age !== undefined) {
    payload.age = specs.age
  }

  if (specs.street_width !== undefined) {
    payload.street_width = specs.street_width
  }

  if (specs.plan_number) {
    payload.plan_number = specs.plan_number
  }

  if (specs.plot_number) {
    payload.plot_number = specs.plot_number
  }

  if (specs.notes) {
    payload.notes = specs.notes
  }

  return payload
}

export async function addProperty(
  data: InsertPropertyInput
): Promise<AddPropertyResult> {
  const parsed = insertPropertySchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid property data. Please check all fields." }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: "You must be signed in to add a property." }
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

    const [
      { data: company, error: companyError },
      { count: propertyCount, error: propertyCountError },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select("max_properties")
        .eq("id", profile.company_id)
        .single(),
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id),
    ])

    if (companyError || !company) {
      return { error: companyError?.message ?? "Company not found." }
    }

    if (propertyCountError) {
      return { error: propertyCountError.message }
    }

    if ((propertyCount ?? 0) >= company.max_properties) {
      return {
        error: QUOTA_EXCEEDED,
        message:
          "You have reached the maximum number of properties for your subscription.",
      }
    }

    const {
      owner_name,
      owner_phone,
      private_notes,
      specs,
      general_notes,
      images,
      custom_property_type,
      custom_neighborhood,
      floors_count,
      apartments_count,
      shops_count,
      has_annex,
      ...publicFields
    } = parsed.data

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        company_id: profile.company_id,
        agent_id: user.id,
        type: publicFields.type,
        custom_property_type: custom_property_type?.trim() || null,
        offer_type: publicFields.offer_type,
        city: publicFields.city,
        neighborhood: publicFields.neighborhood,
        custom_neighborhood: custom_neighborhood?.trim() || null,
        price: publicFields.price,
        area: publicFields.area,
        specs: buildSpecsPayload(specs),
        floors_count: floors_count ?? null,
        apartments_count: apartments_count ?? null,
        shops_count: shops_count ?? null,
        has_annex: has_annex ?? null,
        is_direct: publicFields.is_direct,
        general_notes: general_notes || null,
        images: images ?? [],
      })
      .select("id")
      .single()

    if (propertyError || !property) {
      return {
        error: propertyError?.message ?? "Failed to save property details.",
      }
    }

    const { error: ownerError } = await supabase.from("property_owners").insert({
      property_id: property.id,
      company_id: profile.company_id,
      agent_id: user.id,
      owner_name,
      owner_phone,
      private_notes: private_notes || null,
    })

    if (ownerError) {
      await supabase.from("properties").delete().eq("id", property.id)
      return {
        error: ownerError.message ?? "Failed to save confidential owner details.",
      }
    }

    const propertyTypeLabel = isPropertyTypeOther(publicFields.type)
      ? custom_property_type?.trim() ||
        formatPropertyType(publicFields.type)
      : formatPropertyType(publicFields.type)

    const neighborhoodLabel = isNeighborhoodOther(publicFields.neighborhood)
      ? custom_neighborhood?.trim() || publicFields.city
      : publicFields.neighborhood

    const notificationTitle = "عقار جديد"
    const notificationBody = `تم إضافة عقار جديد: ${propertyTypeLabel} في ${neighborhoodLabel}`

    await createCompanyNotification(
      profile.company_id,
      notificationTitle,
      notificationBody
    )

    await sendCompanyPushNotification(profile.company_id, user.id, {
      title: notificationTitle,
      body: notificationBody,
      url: "/dashboard/search",
    })

    revalidatePath("/dashboard/my-properties")
    return redirectTo("/dashboard/my-properties")
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export type DeletePropertyResult = {
  error: string
} | null

export async function deleteProperty(
  propertyId: string
): Promise<DeletePropertyResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to delete a property." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return {
      error:
        "Your user profile is not set up yet. Contact your office admin.",
    }
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, company_id, agent_id")
    .eq("id", propertyId)
    .maybeSingle()

  if (propertyError || !property) {
    return { error: propertyError?.message ?? "Property not found." }
  }

  if (property.company_id !== profile.company_id) {
    return { error: "You do not have permission to delete this property." }
  }

  const canDelete =
    property.agent_id === user.id || profile.role === "admin"

  if (!canDelete) {
    return { error: "You do not have permission to delete this property." }
  }

  const { error: deleteError } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  await createCompanyNotification(
    profile.company_id,
    "تم حذف عقار",
    `تم حذف العقار بواسطة ${profile.name}`
  )

  revalidatePath("/dashboard/my-properties")
  revalidatePath("/dashboard/search")
  return null
}

export type UpdatePropertyResult = {
  error: string
} | null

async function canManageProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: { company_id: string; role: string },
  propertyId: string
): Promise<
  | { error: string }
  | {
      property: {
        id: string
        company_id: string
        agent_id: string
      }
    }
> {
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, company_id, agent_id")
    .eq("id", propertyId)
    .maybeSingle()

  if (error || !property) {
    return { error: error?.message ?? "Property not found." }
  }

  if (property.company_id !== profile.company_id) {
    return { error: "You do not have permission to modify this property." }
  }

  const allowed =
    property.agent_id === userId || profile.role === "admin"

  if (!allowed) {
    return { error: "You do not have permission to modify this property." }
  }

  return { property }
}

export async function updateProperty(
  data: UpdatePropertyInput
): Promise<UpdatePropertyResult> {
  const parsed = updatePropertySchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid property data. Please check all fields." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update a property." }
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

  const access = await canManageProperty(
    supabase,
    user.id,
    { company_id: profile.company_id, role: profile.role },
    parsed.data.propertyId
  )

  if ("error" in access) {
    return { error: access.error }
  }

  const {
    propertyId,
    owner_name,
    owner_phone,
    private_notes,
    specs,
    general_notes,
    images,
    custom_property_type,
    custom_neighborhood,
    floors_count,
    apartments_count,
    shops_count,
    has_annex,
    ...publicFields
  } = parsed.data

  const { error: propertyError } = await supabase
    .from("properties")
    .update({
      type: publicFields.type,
      custom_property_type: custom_property_type?.trim() || null,
      offer_type: publicFields.offer_type,
      city: publicFields.city,
      neighborhood: publicFields.neighborhood,
      custom_neighborhood: custom_neighborhood?.trim() || null,
      price: publicFields.price,
      area: publicFields.area,
      specs: buildSpecsPayload(specs),
      floors_count: floors_count ?? null,
      apartments_count: apartments_count ?? null,
      shops_count: shops_count ?? null,
      has_annex: has_annex ?? null,
      is_direct: publicFields.is_direct,
      general_notes: general_notes || null,
      images: images ?? [],
    })
    .eq("id", propertyId)

  if (propertyError) {
    return { error: propertyError.message }
  }

  const { error: ownerError } = await supabase
    .from("property_owners")
    .update({
      owner_name,
      owner_phone,
      private_notes: private_notes || null,
    })
    .eq("property_id", propertyId)

  if (ownerError) {
    return { error: ownerError.message }
  }

  revalidatePath("/dashboard/my-properties")
  revalidatePath("/dashboard/search")
  revalidatePath(`/dashboard/properties/${propertyId}/edit`)
  return null
}
