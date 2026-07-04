import {
  NEIGHBORHOOD_OTHER_OPTION,
  normalizePropertyType,
  OTHER_OPTION,
  PROPERTY_TYPE_VALUES,
  type PropertyTypeValue,
} from "@/lib/constants/property-types"
import type { PropertyType } from "@/types/property"

const PROPERTY_TYPE_LABELS_EN: Record<PropertyTypeValue, string> = {
  apartment: "Apartment",
  duplex_apartment: "Duplex Apartment",
  villa: "Villa",
  duplex_villa: "Duplex Villa",
  building: "Building",
  land: "Land",
  shop: "Shop",
  showroom: "Showroom",
  warehouse: "Warehouse",
  rest_house: "Rest House",
  farm: "Farm",
  chalet: "Chalet",
  [OTHER_OPTION]: "Other",
}

export function formatPropertyType(
  type: PropertyType | string,
  locale: "ar" | "en" = "ar",
  customType?: string | null
): string {
  const normalized = normalizePropertyType(type)

  if (normalized === OTHER_OPTION && customType?.trim()) {
    return customType.trim()
  }

  if (locale === "en") {
    return (
      PROPERTY_TYPE_LABELS_EN[normalized as PropertyTypeValue] ??
      String(normalized)
    )
  }

  const ARABIC_LABELS: Record<PropertyTypeValue, string> = {
    apartment: "شقة",
    duplex_apartment: "شقة دوبلكس",
    villa: "فيلا",
    duplex_villa: "فيلا دوبلكس",
    building: "عمارة",
    land: "أرض",
    shop: "محل",
    showroom: "معرض",
    warehouse: "مستودع",
    rest_house: "استراحة",
    farm: "مزرعة",
    chalet: "شاليه",
    [OTHER_OPTION]: "أخرى",
  }

  return ARABIC_LABELS[normalized as PropertyTypeValue] ?? String(normalized)
}

export const PROPERTY_TYPES: PropertyType[] = [...PROPERTY_TYPE_VALUES]

export function formatNeighborhoodLabel(
  neighborhood: string,
  customNeighborhood?: string | null
): string {
  if (
    neighborhood === NEIGHBORHOOD_OTHER_OPTION &&
    customNeighborhood?.trim()
  ) {
    return customNeighborhood.trim()
  }

  return neighborhood
}
