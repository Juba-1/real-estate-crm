"use server"

import { revalidatePath } from "next/cache"

import { requireSuperAdmin } from "@/lib/auth/super-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  systemSettingsSchema,
  type SystemSettingsInput,
} from "@/types/settings"

export type SaveSystemSettingsResult =
  | { success: true }
  | { error: string }

export async function saveSystemSettings(
  data: SystemSettingsInput
): Promise<SaveSystemSettingsResult> {
  const parsed = systemSettingsSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid settings data. Please check all fields." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const adminClient = createAdminClient()
  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await adminClient
    .from("system_settings")
    .upsert(rows, { onConflict: "key" })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/super-admin/settings")
  return { success: true }
}
