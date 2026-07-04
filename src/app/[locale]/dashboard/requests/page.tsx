import { ClipboardListIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { AddRequestDialog } from "@/components/requests/add-request-dialog"
import { RequestCard } from "@/components/requests/request-card"
import { getCompanyRequests } from "@/lib/data/requests"
import { getCurrentUser } from "@/lib/data/user"

export default async function RequestsPage() {
  const [requests, currentUser] = await Promise.all([
    getCompanyRequests(),
    getCurrentUser(),
  ])
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
        <AddRequestDialog />
      </div>

      {requests.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <ClipboardListIcon className="mb-3 size-10 text-muted-foreground" />
          <h2 className="font-heading text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
