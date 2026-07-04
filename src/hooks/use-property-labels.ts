"use client"

import { useLocale, useTranslations } from "next-intl"

import type { OfferType, PropertyStatus, PropertyType } from "@/types/property"

export function usePropertyLabels() {
  const locale = useLocale()
  const tTypes = useTranslations("properties.types")
  const tOffers = useTranslations("offers")
  const tStatus = useTranslations("status")

  function formatPrice(price: number) {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return {
    propertyType: (type: PropertyType, customType?: string | null) => {
      if (type === "أخرى" && customType?.trim()) {
        return customType.trim()
      }

      return tTypes(type)
    },
    offerType: (type: OfferType) => tOffers(type),
    status: (status: PropertyStatus) => tStatus(status),
    formatPrice,
  }
}
