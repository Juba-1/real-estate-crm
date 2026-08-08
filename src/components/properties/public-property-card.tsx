"use client"

import { Building2Icon, MapPinIcon, PhoneIcon, UserIcon, AlertTriangleIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { CompanyProperty } from "@/lib/data/properties"
import {
  getPropertyStatusBadgeClassName,
  URGENT_BADGE_CLASS,
  URGENT_CARD_SURFACE_CLASS,
} from "@/lib/ui/badge-styles"
import { formatListingDate } from "@/lib/format-listing-date"
import { isCurrentlyUrgent } from "@/lib/urgent"
import { cn } from "@/lib/utils"
import type { PropertyStatus } from "@/types/property"

type PublicPropertyCardProps = {
  property: CompanyProperty
}

export function PublicPropertyCard({ property }: PublicPropertyCardProps) {
  const locale = useLocale()
  const { propertyType, offerType, status, formatPrice } = usePropertyLabels()
  const t = useTranslations("properties")
  const tCommon = useTranslations("common")
  const tUrgent = useTranslations("urgent")

  const thumbnail = property.images[0]
  const rooms =
    typeof property.specs?.rooms === "number" ? property.specs.rooms : null
  const agentName = property.agent?.name ?? tCommon("unknownAgent")
  const agentPhone = property.agent?.phone
  const listingDate = formatListingDate(property.created_at, locale)
  const isUrgent = isCurrentlyUrgent(property.urgent_until)

  return (
    <Card
      className={cn(
        "overflow-hidden pt-0",
        isUrgent && URGENT_CARD_SURFACE_CLASS
      )}
      data-urgent={isUrgent ? "true" : undefined}
    >
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

        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur-sm">
            {listingDate}
          </span>
        </div>

        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          {isUrgent ? (
            <Badge className={URGENT_BADGE_CLASS}>
              <AlertTriangleIcon className="size-3" aria-hidden />
              {tUrgent("badge")}
            </Badge>
          ) : null}
          <Badge className={cn(getPropertyStatusBadgeClassName(property.status))}>
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
          <Badge variant="outline">
            {propertyType(property.type, property.custom_property_type)}
          </Badge>
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
        {property.google_maps_url ? (
          <Button asChild variant="secondary" size="sm" className="mt-2 gap-2">
            <a
              href={property.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPinIcon className="size-4" />
              {t("viewLocation")}
            </a>
          </Button>
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
