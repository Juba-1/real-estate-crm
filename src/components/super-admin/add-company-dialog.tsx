"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2Icon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { onboardNewTenant } from "@/actions/companies"
import {
  CompanyQuotaFields,
  fillQuotasFromPackage,
  getInitialQuotas,
} from "@/components/super-admin/company-quota-fields"
import {
  getDefaultPackageId,
  PackageSelectField,
} from "@/components/super-admin/package-select-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  onboardNewTenantSchema,
  type OnboardNewTenantInput,
} from "@/types/company"
import type { PackageRow } from "@/types/package"

type AddCompanyDialogProps = {
  packages: PackageRow[]
}

function buildDefaultValues(packages: PackageRow[]): OnboardNewTenantInput {
  const packageId = getDefaultPackageId(packages)
  const quotas = getInitialQuotas(packages, packageId)

  return {
    companyName: "",
    packageId,
    maxProperties: quotas.maxProperties,
    maxAgents: quotas.maxAgents,
    adminName: "",
    adminUsername: "",
    adminPassword: "",
    adminPhone: "",
  }
}

export function AddCompanyDialog({ packages }: AddCompanyDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tActions = useTranslations("actions")

  const form = useForm<OnboardNewTenantInput>({
    resolver: zodResolver(
      onboardNewTenantSchema
    ) as Resolver<OnboardNewTenantInput>,
    defaultValues: buildDefaultValues(packages),
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset(buildDefaultValues(packages))
    }
  }

  function onSubmit(values: OnboardNewTenantInput) {
    startTransition(async () => {
      const result = await onboardNewTenant(values)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        t("toastTenantOnboarded", {
          company: values.companyName,
          admin: values.adminName,
        })
      )
      form.reset(buildDefaultValues(packages))
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={packages.length === 0}>
          <Building2Icon className="size-4" />
          {t("onboardTenant")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("onboardTenantTitle")}</DialogTitle>
          <DialogDescription>{t("onboardTenantDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6"
          >
            <section className="grid gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("agencyDetailsSection")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("agencyDetailsSectionHint")}
                </p>
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("companyName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("companyNamePlaceholder")}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packageId"
                render={({ field }) => (
                  <FormItem>
                    <PackageSelectField
                      packages={packages}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        fillQuotasFromPackage(packages, value, form.setValue)
                      }}
                      disabled={isPending}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CompanyQuotaFields
                control={form.control as never}
                disabled={isPending}
              />
            </section>

            <Separator />

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("agencyAdminSection")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("agencyAdminSectionHint")}
                </p>
              </div>

              <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("agentName")}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adminUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("username")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("username")}
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        {...field}
                        onChange={(event) => {
                          const value = event.target.value.replace(
                            /[^a-zA-Z0-9]/g,
                            ""
                          )
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={tPlaceholders("password")}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adminPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("phoneOptional")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("phone")}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                {tActions("cancel")}
              </Button>
              <Button type="submit" disabled={isPending || packages.length === 0}>
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {t("onboardingTenant")}
                  </>
                ) : (
                  t("completeOnboarding")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
