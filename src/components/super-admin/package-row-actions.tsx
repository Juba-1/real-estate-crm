"use client"

import { useState, useTransition } from "react"
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { deletePackage, updatePackage } from "@/actions/packages"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PackageRow } from "@/types/package"

type PackageRowActionsProps = {
  pkg: PackageRow
  variant?: "menu" | "inline"
}

export function PackageRowActions({
  pkg,
  variant = "menu",
}: PackageRowActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [name, setName] = useState(pkg.name)
  const [maxProperties, setMaxProperties] = useState(String(pkg.max_properties))
  const [maxAgents, setMaxAgents] = useState(String(pkg.max_agents))
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")
  const tActions = useTranslations("actions")

  function handleEditOpenChange(open: boolean) {
    setEditDialogOpen(open)
    if (open) {
      setName(pkg.name)
      setMaxProperties(String(pkg.max_properties))
      setMaxAgents(String(pkg.max_agents))
    }
  }

  function handleUpdate() {
    const trimmedName = name.trim()
    const parsedMaxProperties = Number(maxProperties)
    const parsedMaxAgents = Number(maxAgents)

    if (trimmedName.length < 2) {
      toast.error(t("packageNameError"))
      return
    }

    if (
      !Number.isInteger(parsedMaxProperties) ||
      parsedMaxProperties < 1 ||
      !Number.isInteger(parsedMaxAgents) ||
      parsedMaxAgents < 1
    ) {
      toast.error(t("editCompanyQuotaError"))
      return
    }

    startTransition(async () => {
      const result = await updatePackage({
        packageId: pkg.id,
        name: trimmedName,
        maxProperties: parsedMaxProperties,
        maxAgents: parsedMaxAgents,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastPackageUpdated", { name: trimmedName }))
      setEditDialogOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePackage(pkg.id)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastPackageDeleted", { name: pkg.name }))
      setDeleteDialogOpen(false)
    })
  }

  return (
    <>
      {variant === "inline" ? (
        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => handleEditOpenChange(true)}
          >
            <PencilIcon className="size-4" />
            {t("editPackage")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {t("deletePackage")}
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-8">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">
                {t("openPackageActions", { name: pkg.name })}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleEditOpenChange(true)}>
              <PencilIcon className="size-4" />
              {t("editPackage")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-4" />
              {t("deletePackage")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={editDialogOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editPackageTitle")}</DialogTitle>
            <DialogDescription>
              {t("editPackageDescription", { name: pkg.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`package-name-${pkg.id}`}>
                {tFields("packageName")}
              </Label>
              <Input
                id={`package-name-${pkg.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`package-props-${pkg.id}`}>
                  {tFields("maxProperties")}
                </Label>
                <Input
                  id={`package-props-${pkg.id}`}
                  type="number"
                  min={1}
                  value={maxProperties}
                  onChange={(event) => setMaxProperties(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`package-agents-${pkg.id}`}>
                  {tFields("maxAgents")}
                </Label>
                <Input
                  id={`package-agents-${pkg.id}`}
                  type="number"
                  min={1}
                  value={maxAgents}
                  onChange={(event) => setMaxAgents(event.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("savingPackage")}
                </>
              ) : (
                tActions("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deletePackageTitle", { name: pkg.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePackageDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("deletingPackage")}
                </>
              ) : (
                t("deletePackage")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
