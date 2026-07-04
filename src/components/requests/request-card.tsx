"use client"

import { useTransition } from "react"
import { Loader2Icon, PhoneIcon, UserIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { manageRequest } from "@/actions/request"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { CompanyRequest } from "@/lib/data/requests"
import { cn } from "@/lib/utils"
import type { ManageRequestAction } from "@/types/request"
import type { UserRole } from "@/types/user"

function getDaysUntilExpiry(expiresAt: string) {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function getExpiryBadgeClassName(daysLeft: number) {
  if (daysLeft <= 3) {
    return "border-destructive/30 bg-destructive/15 text-destructive"
  }

  if (daysLeft <= 7) {
    return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
  }

  return "border-border bg-muted text-muted-foreground"
}

type RequestCardProps = {
  request: CompanyRequest
  currentUserId: string
  currentUserRole: UserRole | null
}

export function RequestCard({
  request,
  currentUserId,
  currentUserRole,
}: RequestCardProps) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("requests")
  const tCommon = useTranslations("common")
  const { propertyType, offerType } = usePropertyLabels()
  const daysLeft = getDaysUntilExpiry(request.expires_at)
  const canManage =
    currentUserId === request.agent_id ||
    currentUserRole === "admin" ||
    currentUserRole === "super_admin"

  const locationLabel = request.neighborhood
    ? `${request.city} - ${request.neighborhood}`
    : request.city

  function getExpiryLabel() {
    if (daysLeft === 0) {
      return t("expiresToday")
    }

    if (daysLeft === 1) {
      return t("expiresInOneDay")
    }

    return t("expiresInDays", { days: daysLeft })
  }

  function handleManage(actionType: ManageRequestAction) {
    startTransition(async () => {
      const result = await manageRequest(request.id, actionType)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      const messages: Record<ManageRequestAction, string> = {
        renew: t("toastRenew"),
        execute: t("toastExecute"),
        archive: t("toastArchive"),
      }

      toast.success(messages[actionType])
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            {t("wanted", {
              offer: offerType(request.offer_type),
              type: propertyType(request.type),
              location: locationLabel,
            })}
          </CardTitle>
          <Badge className={cn(getExpiryBadgeClassName(daysLeft))}>
            {getExpiryLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <p className="text-sm leading-relaxed text-foreground">{request.details}</p>

        <div className="rounded-lg border bg-primary/5 p-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-primary uppercase">
            {t("requestingAgent")}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserIcon className="size-4 shrink-0 text-primary" />
              <span>{request.agent?.name ?? tCommon("unknownAgent")}</span>
            </div>
            {request.agent?.phone ? (
              <a
                href={`tel:${request.agent.phone.replace(/\s+/g, "")}`}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <PhoneIcon className="size-4 shrink-0 text-primary" />
                <span>{request.agent.phone}</span>
              </a>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon className="size-4 shrink-0" />
                {tCommon("phoneNotAvailable")}
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {canManage ? (
        <CardFooter className="mt-auto flex flex-col gap-2 border-t bg-muted/20 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => handleManage("renew")}
          >
            {t("renew")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => handleManage("execute")}
          >
            {t("markExecuted")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => handleManage("archive")}
          >
            {t("archive")}
          </Button>
          {isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              {t("updating")}
            </div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
