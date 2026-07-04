"use client"

import { useTranslations } from "next-intl"
import type { Control } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

type CompanyQuotaFieldsProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  disabled?: boolean
}

export function CompanyQuotaFields({ control, disabled }: CompanyQuotaFieldsProps) {
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("customQuotaHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="maxProperties"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("maxProperties")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={tPlaceholders("maxProperties")}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="maxAgents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("maxAgents")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={tPlaceholders("maxAgents")}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

export function getInitialQuotas(
  packages: { id: string; max_properties: number; max_agents: number }[],
  packageId: string
) {
  const selectedPackage = packages.find((pkg) => pkg.id === packageId)

  return {
    maxProperties: selectedPackage?.max_properties ?? 1,
    maxAgents: selectedPackage?.max_agents ?? 1,
  }
}

export function fillQuotasFromPackage(
  packages: { id: string; max_properties: number; max_agents: number }[],
  packageId: string,
  setValue: (
    name: "maxProperties" | "maxAgents",
    value: number,
    options?: { shouldDirty?: boolean }
  ) => void
) {
  const selectedPackage = packages.find((pkg) => pkg.id === packageId)

  if (!selectedPackage) {
    return
  }

  setValue("maxProperties", selectedPackage.max_properties, { shouldDirty: true })
  setValue("maxAgents", selectedPackage.max_agents, { shouldDirty: true })
}
