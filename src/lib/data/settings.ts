import { createClient } from "@/lib/supabase/server"
import {
  systemSettingsSchema,
  type SystemSettingsInput,
} from "@/types/settings"

const SETTING_KEYS = [
  "platformName",
  "supportEmail",
  "defaultCurrency",
  "maintenanceMode",
] as const

const DEFAULT_SETTINGS: SystemSettingsInput = {
  platformName: "Real Estate CRM",
  supportEmail: "support@system.com",
  defaultCurrency: "SAR",
  maintenanceMode: false,
}

export async function getSystemSettings(): Promise<SystemSettingsInput> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("system_settings").select("key, value")

  if (error || !data?.length) {
    return DEFAULT_SETTINGS
  }

  const raw: Record<string, unknown> = { ...DEFAULT_SETTINGS }

  for (const row of data) {
    if (SETTING_KEYS.includes(row.key as (typeof SETTING_KEYS)[number])) {
      raw[row.key] = row.value
    }
  }

  const parsed = systemSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}
