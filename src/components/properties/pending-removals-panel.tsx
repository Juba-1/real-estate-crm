"use client"

import { useState, useTransition } from "react"
import { ArchiveIcon, CheckIcon, Loader2Icon, XIcon, AlertTriangleIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { decidePropertyRemoval } from "@/actions/property-removal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { PendingRemovalRequest } from "@/lib/data/property-removals"
import { URGENT_BADGE_CLASS } from "@/lib/ui/badge-styles"
import { getPropertyStatusBadgeClassName } from "@/lib/ui/badge-styles"
import { cn } from "@/lib/utils"

type PendingRemovalsPanelProps = {
  requests: PendingRemovalRequest[]
}

export function PendingRemovalsPanel({ requests }: PendingRemovalsPanelProps) {
  const t = useTranslations("propertyRemoval")
  const tUrgent = useTranslations("urgent")
  const locale = useLocale()
  const { propertyType, offerType, status } = usePropertyLabels()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function decide(
    requestId: string,
    decision: "approve" | "reject" | "archive"
  ) {
    setBusyId(requestId)
    startTransition(async () => {
      const result = await decidePropertyRemoval({
        requestId,
        decision,
        decisionNote: notes[requestId]?.trim() || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        setBusyId(null)
        return
      }

      toast.success(
        decision === "approve"
          ? t("toastApproved")
          : decision === "reject"
            ? t("toastRejected")
            : t("toastArchived")
      )
      setBusyId(null)
    })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
        <h2 className="font-heading text-lg font-medium">{t("emptyTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => {
        const property = request.property
        const busy = isPending && busyId === request.id
        const requestedAt = new Intl.DateTimeFormat(
          locale === "ar" ? "ar-SA" : "en-SA",
          { dateStyle: "medium", timeStyle: "short" }
        ).format(new Date(request.created_at))

        return (
          <Card key={request.id}>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {property
                    ? `${propertyType(property.type, property.custom_property_type)} · ${offerType(property.offer_type)}`
                    : t("propertyMissing")}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {property?.is_urgent ? (
                    <Badge className={URGENT_BADGE_CLASS}>
                      <AlertTriangleIcon className="size-3" aria-hidden />
                      {tUrgent("badge")}
                    </Badge>
                  ) : null}
                  {property ? (
                    <Badge
                      className={cn(
                        getPropertyStatusBadgeClassName(property.status)
                      )}
                    >
                      {status(property.status)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {property
                  ? `${property.city} · ${property.neighborhood}`
                  : t("propertyMissingHint")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">{t("employee")}: </span>
                  {request.requester_name}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("requestedAt")}: </span>
                  {requestedAt}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("reason")}: </span>
                  {t(`reasons.${request.reason_key}`)}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    {t("opportunityCount")}:{" "}
                  </span>
                  {request.opportunity_receipt_count}
                </p>
              </div>
              {request.reason_detail ? (
                <p className="rounded-lg border bg-muted/30 px-3 py-2 text-muted-foreground">
                  {request.reason_detail}
                </p>
              ) : null}
              <Textarea
                value={notes[request.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))
                }
                placeholder={t("decisionNotePlaceholder")}
                rows={2}
                maxLength={500}
                disabled={busy}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                className="gap-2"
                onClick={() => decide(request.id, "reject")}
              >
                {busy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <XIcon className="size-4" />
                )}
                {t("reject")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy || !property}
                className="gap-2"
                onClick={() => decide(request.id, "archive")}
              >
                <ArchiveIcon className="size-4" />
                {t("archiveInstead")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy || !property}
                className="gap-2"
                onClick={() => decide(request.id, "approve")}
              >
                <CheckIcon className="size-4" />
                {t("approveRemoval")}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
