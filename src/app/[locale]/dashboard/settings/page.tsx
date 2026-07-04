import { getTranslations } from "next-intl/server"

import { CompanySettingsForm } from "@/components/dashboard/company-settings-form"
import { getCompanyBranding } from "@/lib/data/company"
import { getCurrentUser } from "@/lib/data/user"

export default async function CompanySettingsPage() {
  const user = await getCurrentUser()
  const t = await getTranslations("companySettings")

  if (!user?.company_id) {
    throw new Error("Company profile is required.")
  }

  const company = await getCompanyBranding(user.company_id)

  if (!company) {
    throw new Error("Company not found.")
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <CompanySettingsForm company={company} />
    </div>
  )
}
