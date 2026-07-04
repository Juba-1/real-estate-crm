import { getTranslations } from "next-intl/server"

import { getCurrentUser } from "@/lib/data/user"

import { AddPropertyForm } from "@/components/dashboard/add-property-form"

export default async function AddPropertyPage() {
  const user = await getCurrentUser()
  const t = await getTranslations("addProperty")

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <AddPropertyForm companyId={user?.company_id ?? null} />
    </div>
  )
}
