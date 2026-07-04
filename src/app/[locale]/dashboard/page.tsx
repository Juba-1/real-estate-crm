import { getTranslations } from "next-intl/server"

import { getTenantDashboardStats } from "@/actions/analytics"
import { TenantAnalyticsDashboard } from "@/components/dashboard/tenant-analytics-dashboard"
import { getCurrentUser } from "@/lib/data/user"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const t = await getTranslations("common")

  const displayName = user?.name ?? "there"

  if (!user?.company_id) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("welcomeBack", { name: displayName })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("setupPending")}</p>
      </div>
    )
  }

  const result = await getTenantDashboardStats()

  if ("error" in result) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("welcomeBack", { name: displayName })}
        </h1>
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  return (
    <TenantAnalyticsDashboard
      stats={result.stats}
      displayName={displayName}
    />
  )
}
