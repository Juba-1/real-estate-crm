import { Suspense } from "react"
import { SearchIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PublicPropertyCard } from "@/components/properties/public-property-card"
import { SearchFilters } from "@/components/properties/search-filters"
import {
  getCompanyProperties,
  type CompanyPropertySearchParams,
} from "@/lib/data/properties"

type SearchPageProps = {
  searchParams: Promise<CompanyPropertySearchParams>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const properties = await getCompanyProperties(params)
  const t = await getTranslations("search")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
        }
      >
        <SearchFilters />
      </Suspense>

      {properties.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <SearchIcon className="mb-3 size-10 text-muted-foreground" />
          <h2 className="font-heading text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PublicPropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
