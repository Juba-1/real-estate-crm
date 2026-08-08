"use client"

import { useState, useTransition } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { requestPropertyRemoval } from "@/actions/property-removal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { RemovalReasonKey } from "@/types/property-removal"

const REASON_KEYS: RemovalReasonKey[] = [
  "mistake",
  "duplicate",
  "owner_withdrew",
  "wrong_info",
  "other",
]

type RequestPropertyRemovalDialogProps = {
  propertyId: string
  disabled?: boolean
  alreadyPending?: boolean
}

export function RequestPropertyRemovalDialog({
  propertyId,
  disabled,
  alreadyPending,
}: RequestPropertyRemovalDialogProps) {
  const t = useTranslations("propertyRemoval")
  const [open, setOpen] = useState(false)
  const [reasonKey, setReasonKey] = useState<RemovalReasonKey | "">("")
  const [reasonDetail, setReasonDetail] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!reasonKey) {
      toast.error(t("reasonRequired"))
      return
    }

    startTransition(async () => {
      const result = await requestPropertyRemoval({
        propertyId,
        reasonKey,
        reasonDetail: reasonDetail.trim() || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastRequested"))
      setOpen(false)
      setReasonKey("")
      setReasonDetail("")
    })
  }

  if (alreadyPending) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Trash2Icon className="size-4" />
        {t("pendingBadge")}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="gap-2"
          disabled={disabled || isPending}
        >
          <Trash2Icon className="size-4" />
          {t("requestRemoval")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>{t("reasonLabel")}</Label>
            <Select
              value={reasonKey}
              onValueChange={(value) => setReasonKey(value as RemovalReasonKey)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {REASON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`reasons.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("detailLabel")}</Label>
            <Textarea
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              placeholder={t("detailPlaceholder")}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
