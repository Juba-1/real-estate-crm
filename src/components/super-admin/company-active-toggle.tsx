"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { updateCompanyActiveStatus } from "@/actions/companies"
import { Switch } from "@/components/ui/switch"

type CompanyActiveToggleProps = {
  companyId: string
  companyName: string
  isActive: boolean
}

export function CompanyActiveToggle({
  companyId,
  companyName,
  isActive,
}: CompanyActiveToggleProps) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("superAdmin")

  function handleChange(checked: boolean) {
    startTransition(async () => {
      const result = await updateCompanyActiveStatus(companyId, checked)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        checked
          ? t("toastCompanyActivated", { name: companyName })
          : t("toastCompanyDeactivated", { name: companyName })
      )
    })
  }

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={handleChange}
      aria-label={
        isActive
          ? t("deactivateCompany", { name: companyName })
          : t("activateCompany", { name: companyName })
      }
    />
  )
}
