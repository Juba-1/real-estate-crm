"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import { usePathname, useRouter } from "@/i18n/navigation"
import { EASTERN_CITY_NAMES } from "@/lib/constants/locations"
import { PROPERTY_TYPES } from "@/lib/property-utils"
import type { OfferType, PropertyStatus, PropertyType } from "@/types/property"
import { useSearchParams } from "next/navigation"

const OFFER_TYPES: OfferType[] = ["sale", "rent"]

const STATUS_OPTIONS: PropertyStatus[] = [
  "available",
  "pending",
  "sold",
  "rented",
]

const ALL_VALUE = "all"

export function SearchFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { propertyType, offerType, status } = usePropertyLabels()
  const t = useTranslations("search")
  const tFields = useTranslations("fields")

  const currentCity = searchParams.get("city") ?? ALL_VALUE
  const currentType = searchParams.get("type") ?? ALL_VALUE
  const currentOfferType = searchParams.get("offer_type") ?? ALL_VALUE
  const currentStatus = searchParams.get("status") ?? "available"

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === ALL_VALUE || (key === "status" && value === "available")) {
        params.delete(key)
      } else {
        params.set(key, value)
      }

      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {tFields("city")}
        </p>
        <Select
          value={currentCity}
          onValueChange={(value) => updateFilter("city", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("allCities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("allCities")}</SelectItem>
            {EASTERN_CITY_NAMES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("propertyType")}
        </p>
        <Select
          value={currentType}
          onValueChange={(value) => updateFilter("type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("allTypes")}</SelectItem>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {propertyType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("offerType")}
        </p>
        <Select
          value={currentOfferType}
          onValueChange={(value) => updateFilter("offer_type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("allOffers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("allOffers")}</SelectItem>
            {OFFER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {offerType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("status")}
        </p>
        <Select
          value={currentStatus}
          onValueChange={(value) => updateFilter("status", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={status("available")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {status(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
