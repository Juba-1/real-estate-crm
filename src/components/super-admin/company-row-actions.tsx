"use client"

import { useEffect, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  KeyRoundIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import {
  deleteCompany,
  resetTenantAdminPassword,
  updateCompany,
} from "@/actions/companies"
import {
  CompanyQuotaFields,
  fillQuotasFromPackage,
} from "@/components/super-admin/company-quota-fields"
import {
  getDefaultPackageId,
  PackageSelectField,
} from "@/components/super-admin/package-select-field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  updateCompanySchema,
  type CompanyRow,
  type UpdateCompanyInput,
} from "@/types/company"
import type { PackageRow } from "@/types/package"

type CompanyRowActionsProps = {
  company: CompanyRow
  packages: PackageRow[]
}

function buildEditDefaults(
  company: CompanyRow,
  packages: PackageRow[]
): UpdateCompanyInput {
  return {
    companyId: company.id,
    name: company.name,
    packageId: getDefaultPackageId(packages, company.package_id),
    maxProperties: company.max_properties,
    maxAgents: company.max_agents,
  }
}

export function CompanyRowActions({
  company,
  packages,
}: CompanyRowActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("superAdmin")
  const tActions = useTranslations("actions")
  const tErrors = useTranslations("errors")

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema) as Resolver<UpdateCompanyInput>,
    defaultValues: buildEditDefaults(company, packages),
  })

  useEffect(() => {
    if (editDialogOpen) {
      form.reset(buildEditDefaults(company, packages))
    }
  }, [editDialogOpen, company, packages, form])

  function handleEditOpenChange(open: boolean) {
    setEditDialogOpen(open)
  }

  function onSubmit(values: UpdateCompanyInput) {
    startTransition(async () => {
      const result = await updateCompany(values)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastCompanyUpdated", { name: values.name }))
      setEditDialogOpen(false)
    })
  }

  function handlePasswordReset() {
    if (newPassword.length < 6) {
      toast.error(tErrors("passwordMinLength"))
      return
    }

    startTransition(async () => {
      const result = await resetTenantAdminPassword(company.id, newPassword)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastAdminPasswordReset", { company: company.name }))
      setNewPassword("")
      setPasswordDialogOpen(false)
    })
  }

  function handleDeleteCompany() {
    startTransition(async () => {
      const result = await deleteCompany(company.id)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastCompanyDeleted", { name: company.name }))
      setDeleteDialogOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-8">
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">
              {t("openCompanyActions", { name: company.name })}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => handleEditOpenChange(true)}>
            <PencilIcon className="size-4" />
            {t("editCompany")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)}>
            <KeyRoundIcon className="size-4" />
            {t("resetAdminPassword")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {t("deleteCompany")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editDialogOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editCompanyTitle")}</DialogTitle>
            <DialogDescription>
              {t("editCompanyDescription", { company: company.name })}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyName")}</FormLabel>
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
                      id={`company-package-${company.id}`}
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

              <input type="hidden" {...form.register("companyId")} />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isPending}
                >
                  {tActions("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      {t("savingCompany")}
                    </>
                  ) : (
                    tActions("save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("resetAdminPasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("resetAdminPasswordDescription", { company: company.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={`admin-password-${company.id}`}>
              {t("newAdminPassword")}
            </Label>
            <Input
              id={`admin-password-${company.id}`}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={tErrors("passwordMinLength")}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handlePasswordReset}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("resettingAdminPassword")}
                </>
              ) : (
                t("resetAdminPassword")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteCompanyTitle", { name: company.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteCompanyDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("deletingCompany")}
                </>
              ) : (
                t("deleteCompany")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
