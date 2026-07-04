import { getTranslations } from "next-intl/server"

import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingPricing } from "@/components/landing/landing-pricing"
import { getCurrentUser } from "@/lib/data/user"
import { getPublicPackages } from "@/lib/data/packages"
import type { CurrentUserProfile } from "@/types/user"

function resolveDashboardHref(user: CurrentUserProfile | null): string | null {
  if (!user) {
    return null
  }

  if (user.role === "super_admin") {
    return "/super-admin"
  }

  return "/dashboard"
}

export default async function Home() {
  const [user, packages, tCommon] = await Promise.all([
    getCurrentUser(),
    getPublicPackages(),
    getTranslations("common"),
  ])

  const dashboardHref = resolveDashboardHref(user)
  const appName = tCommon("appName")

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <LandingHeader appName={appName} dashboardHref={dashboardHref} />
      <LandingHero dashboardHref={dashboardHref} />
      <LandingFeatures />
      <LandingPricing packages={packages} />
      <LandingFooter appName={appName} />
    </div>
  )
}
