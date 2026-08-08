import { Building2Icon, PlusCircleIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PropertyCard } from "@/components/properties/property-card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ListPagination } from "@/components/ui/list-pagination"
import { Link } from "@/i18n/navigation"
import { getMyProperties } from "@/lib/data/properties"
import { getPendingRemovalPropertyIdsForAgent } from "@/lib/data/property-removals"
import { getCurrentUser } from "@/lib/data/user"

type MyPropertiesPageProps = {
  searchParams: Promise<{ page?: string | string[] }>
}

export default async function MyPropertiesPage({
  searchParams,
}: MyPropertiesPageProps) {
  const params = await searchParams
  const [result, currentUser, t, tNav] = await Promise.all([
    getMyProperties(params),
    getCurrentUser(),
    getTranslations("myProperties"),
    getTranslations("nav"),
  ])
  const { items: properties, page, hasMore, total } = result
  const pendingIds = currentUser
    ? await getPendingRemovalPropertyIdsForAgent(currentUser.id)
    : new Set<string>()
  const isAdmin = currentUser?.role === "admin"

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
        <EmptyState
          icon={<Building2Icon className="size-10" />}
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
              <PropertyCard
                key={property.id}
                property={property}
                isAdmin={isAdmin}
                removalPending={pendingIds.has(property.id)}
              />
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
