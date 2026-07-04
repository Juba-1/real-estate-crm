import { getTranslations } from "next-intl/server"

import { CreatePackageDialog } from "@/components/super-admin/create-package-dialog"
import { PackagePricingCard } from "@/components/super-admin/package-pricing-card"
import { getAllPackages } from "@/lib/data/packages"

export default async function SuperAdminPackagesPage() {
  const [packages, t] = await Promise.all([
    getAllPackages(),
    getTranslations("superAdmin"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("packagesTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("packagesDescription")}
          </p>
        </div>
        <CreatePackageDialog />
      </div>

      {packages.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
          {t("emptyPackages")}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <PackagePricingCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  )
}
