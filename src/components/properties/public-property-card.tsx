"use client"

import { Building2Icon, PhoneIcon, UserIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { CompanyProperty } from "@/lib/data/properties"
import { cn } from "@/lib/utils"
import type { PropertyStatus } from "@/types/property"

function getStatusBadgeClassName(status: PropertyStatus) {
  switch (status) {
    case "available":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    case "pending":
      return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
    case "sold":
      return "border-destructive/30 bg-destructive/15 text-destructive"
    case "rented":
      return "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300"
    default:
      return ""
  }
}

type PublicPropertyCardProps = {
  property: CompanyProperty
}

export function PublicPropertyCard({ property }: PublicPropertyCardProps) {
  const { propertyType, offerType, status, formatPrice } = usePropertyLabels()
  const t = useTranslations("properties")
  const tCommon = useTranslations("common")

  const thumbnail = property.images[0]
  const rooms =
    typeof property.specs?.rooms === "number" ? property.specs.rooms : null
  const agentName = property.agent?.name ?? tCommon("unknownAgent")
  const agentPhone = property.agent?.phone

  return (
    <Card className="overflow-hidden pt-0">
      <div className="relative aspect-[16/10] w-full bg-muted">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`${property.city} ${property.neighborhood}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Building2Icon className="size-10" />
          </div>
        )}

        <div className="absolute start-3 top-3 flex flex-wrap gap-2">
          <Badge className={cn(getStatusBadgeClassName(property.status))}>
            {status(property.status)}
          </Badge>
          <Badge variant="secondary">
            {offerType(property.offer_type)}
          </Badge>
        </div>
      </div>

      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-semibold">
              {formatPrice(Number(property.price))}
            </p>
            <p className="text-sm text-muted-foreground">
              {property.city}, {property.neighborhood}
            </p>
          </div>
          <Badge variant="outline">{propertyType(property.type)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">{t("area")}:</span>{" "}
          {Number(property.area)} {t("areaUnit")}
        </p>
        {rooms !== null ? (
          <p>
            <span className="text-muted-foreground">{t("rooms")}:</span>{" "}
            {rooms}
          </p>
        ) : null}
      </CardContent>

      <CardContent className="border-t bg-primary/5 py-4">
        <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
          {t("contactColleague")}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserIcon className="size-4 shrink-0 text-primary" />
            <span>{agentName}</span>
          </div>
          {agentPhone ? (
            <a
              href={`tel:${agentPhone.replace(/\s+/g, "")}`}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <PhoneIcon className="size-4 shrink-0 text-primary" />
              <span>{agentPhone}</span>
            </a>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <PhoneIcon className="size-4 shrink-0" />
              {tCommon("phoneNotAvailable")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
