"use client"

import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type UrgentTransferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  /** Which entity copy to use in the transfer description. */
  entity?: "property" | "request"
}

/**
 * Shared confirm dialog when transferring the single urgent slot.
 */
export function UrgentTransferDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  entity = "property",
}: UrgentTransferDialogProps) {
  const t = useTranslations("urgent")
  const entityIndef =
    entity === "property" ? t("propertyEntity") : t("requestEntity")
  const entityDef =
    entity === "property"
      ? t("propertyEntityDefinite")
      : t("requestEntityDefinite")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("transferTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("transferDescription", {
              entityIndef,
              entityDef,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("transferCancel")}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {t("transferConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
