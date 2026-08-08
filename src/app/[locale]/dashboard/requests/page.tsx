import { ClipboardListIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { AddRequestDialog } from "@/components/requests/add-request-dialog"
import { RequestCard } from "@/components/requests/request-card"
import { EmptyState } from "@/components/ui/empty-state"
import { ListPagination } from "@/components/ui/list-pagination"
import { getApprovedDictionaryValues } from "@/lib/data/dictionary"
import { getCompanyRequests } from "@/lib/data/requests"
import { getCurrentUser } from "@/lib/data/user"
import { getCityOptions } from "@/lib/dictionary-catalog"

type RequestsPageProps = {
  searchParams: Promise<{ page?: string | string[] }>
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const params = await searchParams
  const [result, currentUser, cityOptions, approvedPropertyTypes] =
    await Promise.all([
      getCompanyRequests(params),
      getCurrentUser(),
      getCityOptions(),
      getApprovedDictionaryValues("property_type"),
    ])
  const { items: requests, page, hasMore, total } = result
  const t = await getTranslations("requests")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <AddRequestDialog
          cityOptions={cityOptions}
          approvedPropertyTypes={approvedPropertyTypes}
        />
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardListIcon className="size-10" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <AddRequestDialog
              cityOptions={cityOptions}
              approvedPropertyTypes={approvedPropertyTypes}
            />
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                currentUserId={currentUser?.id ?? ""}
                currentUserRole={currentUser?.role ?? null}
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
