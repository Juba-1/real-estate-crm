import { Suspense } from "react"
import { SearchIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PublicPropertyCard } from "@/components/properties/public-property-card"
import { SearchFilters } from "@/components/properties/search-filters"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ListPagination } from "@/components/ui/list-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "@/i18n/navigation"
import { getApprovedDictionaryValues } from "@/lib/data/dictionary"
import {
  getCompanyProperties,
  type CompanyPropertySearchParams,
} from "@/lib/data/properties"
import { getCityOptions } from "@/lib/dictionary-catalog"

type SearchPageProps = {
  searchParams: Promise<CompanyPropertySearchParams>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const [result, t, cityOptions, approvedPropertyTypes] = await Promise.all([
    getCompanyProperties(params),
    getTranslations("search"),
    getCityOptions(),
    getApprovedDictionaryValues("property_type"),
  ])

  const { items: properties, page, hasMore, total } = result

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
        <SearchFilters
          cityOptions={cityOptions}
          approvedPropertyTypes={approvedPropertyTypes}
        />
      </Suspense>

      {properties.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="size-10" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button asChild>
              <Link href="/dashboard/add">{t("emptyAction")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PublicPropertyCard key={property.id} property={property} />
            ))}
          </div>
          <ListPagination
            page={page}
            hasMore={hasMore}
            total={total}
            searchParams={params}
          />
        </>
      )}
    </div>
  )
}
