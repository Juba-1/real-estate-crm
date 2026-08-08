"use server"

import { revalidatePath } from "next/cache"

import { assertCanManageProperty } from "@/lib/authz/tenant"
import { createClient } from "@/lib/supabase/server"
import { extractPropertyMediaPaths } from "@/lib/supabase/storage"
import type { PropertyStatus } from "@/types/property"

export type UpdatePropertyStatusResult = {
  error: string
} | null

export async function updatePropertyStatus(
  propertyId: string,
  newStatus: PropertyStatus,
  deleteImages: boolean,
  currentImageUrls: string[]
): Promise<UpdatePropertyStatusResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to update property status." }
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

  const access = await assertCanManageProperty(
    supabase,
    user.id,
    profile,
    propertyId
  )
  if ("error" in access) {
    return access
  }

  // Archive is manager-only via decidePropertyRemoval ("Archive instead").
  if (newStatus === "archived") {
    return {
      error:
        "Archiving requires manager approval. Use a removal request or Pending Removals.",
    }
  }

  if (deleteImages && currentImageUrls.length > 0) {
    const storagePaths = extractPropertyMediaPaths(currentImageUrls)

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("property_media")
        .remove(storagePaths)

      if (storageError) {
        return { error: storageError.message }
      }
    }

    const { error: updateError } = await supabase
      .from("properties")
      .update({
        status: newStatus,
        images: [],
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId)
      .eq("company_id", profile.company_id)

    if (updateError) {
      return { error: updateError.message }
    }
  } else {
    const { error: updateError } = await supabase
      .from("properties")
      .update({ status: newStatus })
      .eq("id", propertyId)
      .eq("company_id", profile.company_id)

    if (updateError) {
      return { error: updateError.message }
    }
  }

  revalidatePath("/dashboard/my-properties")
  return null
}
