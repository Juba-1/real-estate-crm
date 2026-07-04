import { getTranslations } from "next-intl/server"

import { PlatformGrowthChart } from "@/components/super-admin/platform-growth-chart"
import { RecentCompaniesCard } from "@/components/super-admin/recent-companies-card"
import { SuperAdminMetricCards } from "@/components/super-admin/super-admin-metric-cards"
import {
  getRecentCompanies,
  getSuperAdminStats,
} from "@/lib/data/super-admin"

export default async function SuperAdminOverviewPage() {
  const [stats, recentCompanies, t] = await Promise.all([
    getSuperAdminStats(),
    getRecentCompanies(5),
    getTranslations("superAdmin"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("overviewTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("overviewDescription")}</p>
      </div>

      <SuperAdminMetricCards
        stats={stats}
        labels={{
          totalCompanies: t("totalCompanies"),
          totalCompaniesDesc: t("totalCompaniesDesc"),
          totalUsers: t("totalUsers"),
          totalUsersDesc: t("totalUsersDesc"),
          totalProperties: t("totalProperties"),
          totalPropertiesDesc: t("totalPropertiesDesc"),
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <PlatformGrowthChart />
        <RecentCompaniesCard companies={recentCompanies} />
      </div>
    </div>
  )
}
