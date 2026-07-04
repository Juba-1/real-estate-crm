import { getTranslations } from "next-intl/server"

import { SystemSettingsForm } from "@/components/super-admin/system-settings-form"
import { getSystemSettings } from "@/lib/data/settings"

export default async function SuperAdminSettingsPage() {
  const [settings, t] = await Promise.all([
    getSystemSettings(),
    getTranslations("superAdmin"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("settingsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      <SystemSettingsForm initialSettings={settings} />
    </div>
  )
}
