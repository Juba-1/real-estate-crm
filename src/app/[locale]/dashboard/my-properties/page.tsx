import { Building2Icon, PlusCircleIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PropertyCard } from "@/components/properties/property-card"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getMyProperties } from "@/lib/data/properties"

export default async function MyPropertiesPage() {
  const properties = await getMyProperties()
  const t = await getTranslations("myProperties")
  const tNav = await getTranslations("nav")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/add">
            <PlusCircleIcon className="size-4" />
            {tNav("addProperty")}
          </Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Building2Icon className="mb-3 size-10 text-muted-foreground" />
          <h2 className="font-heading text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/add">{t("emptyAction")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
