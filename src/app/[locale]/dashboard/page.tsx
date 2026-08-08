import { Suspense } from "react"
import dynamic from "next/dynamic"
import { getTranslations } from "next-intl/server"

import { getTenantDashboardStats } from "@/actions/analytics"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/data/user"

const TenantAnalyticsDashboard = dynamic(
  () =>
    import("@/components/dashboard/tenant-analytics-dashboard").then(
      (mod) => mod.TenantAnalyticsDashboard
    ),
  {
    loading: () => (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    ),
  }
)

export default async function DashboardPage() {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("common"),
  ])

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
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      }
    >
      <TenantAnalyticsDashboard
        stats={result.stats}
        displayName={displayName}
      />
    </Suspense>
  )
}
