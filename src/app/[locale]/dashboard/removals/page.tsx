import { getTranslations } from "next-intl/server"

import { PendingRemovalsPanel } from "@/components/properties/pending-removals-panel"
import { getPendingPropertyRemovalRequests } from "@/lib/data/property-removals"

export default async function RemovalsPage() {
  const [requests, t] = await Promise.all([
    getPendingPropertyRemovalRequests(),
    getTranslations("propertyRemoval"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <PendingRemovalsPanel requests={requests} />
    </div>
  )
}
