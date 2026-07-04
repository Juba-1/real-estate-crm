"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PackageRow } from "@/types/package"

type PackageSelectFieldProps = {
  packages: PackageRow[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

export function PackageSelectField({
  packages,
  value,
  onChange,
  disabled,
  id = "package-select",
}: PackageSelectFieldProps) {
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === value),
    [packages, value]
  )

  if (packages.length === 0) {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{tFields("package")}</Label>
        <p className="text-sm text-muted-foreground">{t("noPackagesAvailable")}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{tFields("package")}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={tPlaceholders("selectPackage")} />
        </SelectTrigger>
        <SelectContent>
          {packages.map((pkg) => (
            <SelectItem key={pkg.id} value={pkg.id}>
              {pkg.name} ({pkg.max_properties} / {pkg.max_agents})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPackage ? (
        <p className="text-xs text-muted-foreground">
          {t("packageLimitsHint", {
            properties: selectedPackage.max_properties,
            agents: selectedPackage.max_agents,
          })}
        </p>
      ) : null}
    </div>
  )
}

export function getDefaultPackageId(
  packages: PackageRow[],
  preferredId?: string | null
) {
  if (preferredId && packages.some((pkg) => pkg.id === preferredId)) {
    return preferredId
  }

  return packages[0]?.id ?? ""
}
