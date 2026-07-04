import {
  OTHER_OPTION,
  PROPERTY_TYPE_VALUES,
  type PropertyTypeValue,
} from "@/lib/constants/property-types"
import type { PropertyType } from "@/types/property"

const PROPERTY_TYPE_LABELS_EN: Record<PropertyTypeValue, string> = {
  شقة: "Apartment",
  "شقة دوبلكس": "Duplex Apartment",
  فيلا: "Villa",
  "فيلا دوبلكس": "Duplex Villa",
  عمارة: "Building",
  أرض: "Land",
  محل: "Shop",
  معرض: "Showroom",
  مستودع: "Warehouse",
  استراحة: "Rest House",
  مزرعة: "Farm",
  شاليه: "Chalet",
  [OTHER_OPTION]: "Other",
}

export function formatPropertyType(
  type: PropertyType,
  locale: "ar" | "en" = "ar",
  customType?: string | null
): string {
  if (type === OTHER_OPTION && customType?.trim()) {
    return customType.trim()
  }

  if (locale === "ar") {
    return type
  }

  return PROPERTY_TYPE_LABELS_EN[type as PropertyTypeValue] ?? type
}

export const PROPERTY_TYPES: PropertyType[] = [...PROPERTY_TYPE_VALUES]

export function formatNeighborhoodLabel(
  neighborhood: string,
  customNeighborhood?: string | null
): string {
  if (neighborhood === OTHER_OPTION && customNeighborhood?.trim()) {
    return customNeighborhood.trim()
  }

  return neighborhood
}
