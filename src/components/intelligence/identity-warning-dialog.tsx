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
import type { IdentityMatchResult } from "@/types/intelligence/identity"

type IdentityWarningDialogProps = {
  open: boolean
  match: IdentityMatchResult | null
  onContinue: () => void
  onCancel: () => void
  onOpenExisting: (propertyId: string) => void
}

export function IdentityWarningDialog({
  open,
  match,
  onContinue,
  onCancel,
  onOpenExisting,
}: IdentityWarningDialogProps) {
  const t = useTranslations("identity")

  if (!match) {
    return null
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("warningTitle")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("warningDescription")}</p>
              <p className="font-medium text-foreground">
                {t("confidenceLabel", {
                  percent: match.confidence,
                  level: t(`level_${match.level}`),
                })}
              </p>
              <ul className="list-inside list-disc space-y-1">
                    {match.reasons.map((reason) => (
                  <li key={`${reason.key}-${reason.detail ?? ""}`}>
                    {reason.matched ? "✓ " : "• "}
                    {t.has(`reason_${reason.key}`)
                      ? t(`reason_${reason.key}`, {
                          detail: reason.detail ?? "",
                        })
                      : reason.key}
                  </li>
                ))}
              </ul>
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-foreground">
                <p>
                  {t("existingAgent", {
                    name: match.agent_name ?? t("unknownAgent"),
                  })}
                </p>
                <p>
                  {t("existingCreated", {
                    date: new Date(match.created_at).toLocaleDateString(),
                  })}
                </p>
                <p>
                  {t("existingLocation", {
                    city: match.city,
                    district: match.district,
                    area: match.area,
                  })}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actionCancel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenExisting(match.property_id)}
          >
            {t("actionOpenExisting")}
          </Button>
          <Button type="button" onClick={onContinue}>
            {t("actionContinue")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
