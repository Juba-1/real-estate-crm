"use client"

import { useState, useTransition } from "react"
import { AlertTriangleIcon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  checkUrgentPropertyConflict,
  checkUrgentRequestConflict,
  setPropertyUrgent,
  setRequestUrgent,
} from "@/actions/urgent"
import { UrgentTransferDialog } from "@/components/forms/urgent-transfer-dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"

type UrgentToggleControlProps = {
  entity: "property" | "request"
  entityId: string
  isUrgent: boolean
  disabled?: boolean
}

/**
 * Card quick-action: mark or remove urgent without opening full edit.
 */
export function UrgentToggleControl({
  entity,
  entityId,
  isUrgent,
  disabled = false,
}: UrgentToggleControlProps) {
  const t = useTranslations("urgent")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [transferOpen, setTransferOpen] = useState(false)

  async function applyUrgent(markUrgent: boolean) {
    startTransition(async () => {
      const result =
        entity === "property"
          ? await setPropertyUrgent(entityId, markUrgent)
          : await setRequestUrgent(entityId, markUrgent)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(markUrgent ? t("toastMarked") : t("toastRemoved"))
      router.refresh()
    })
  }

  async function handleMarkClick() {
    if (isUrgent) {
      void applyUrgent(false)
      return
    }

    const conflict =
      entity === "property"
        ? await checkUrgentPropertyConflict(entityId)
        : await checkUrgentRequestConflict(entityId)

    if (conflict.hasConflict) {
      setTransferOpen(true)
      return
    }

    void applyUrgent(true)
  }

  return (
    <>
      <Button
        type="button"
        variant={isUrgent ? "secondary" : "outline"}
        size="sm"
        className="gap-2"
        disabled={disabled || isPending}
        onClick={() => void handleMarkClick()}
        aria-pressed={isUrgent}
        aria-label={isUrgent ? t("removeLabel") : t("markLabel")}
      >
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : (
          <AlertTriangleIcon className="size-4" aria-hidden />
        )}
        {isUrgent ? t("removeLabel") : t("markLabel")}
      </Button>

      <UrgentTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        entity={entity}
        onConfirm={() => {
          setTransferOpen(false)
          void applyUrgent(true)
        }}
        onCancel={() => setTransferOpen(false)}
      />
    </>
  )
}
