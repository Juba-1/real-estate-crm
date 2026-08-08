import { getTranslations } from "next-intl/server"

import { AddPropertyForm } from "@/components/dashboard/add-property-form"
import { getApprovedDictionaryValues } from "@/lib/data/dictionary"
import { getCityOptions } from "@/lib/dictionary-catalog"
import { getCurrentUser } from "@/lib/data/user"

export default async function AddPropertyPage() {
  const [user, t, cityOptions, approvedPropertyTypes] = await Promise.all([
    getCurrentUser(),
    getTranslations("addProperty"),
    getCityOptions(),
    getApprovedDictionaryValues("property_type"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <AddPropertyForm
        companyId={user?.company_id ?? null}
        cityOptions={cityOptions}
        approvedPropertyTypes={approvedPropertyTypes}
      />
    </div>
  )
}
