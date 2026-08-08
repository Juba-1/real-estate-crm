export const OTHER_OPTION = "other" as const

/** Neighborhood "other" stays Arabic — stored as plain text in `neighborhood`. */
export const NEIGHBORHOOD_OTHER_OPTION = "أخرى" as const

export const PROPERTY_TYPE_VALUES = [
  "apartment",
  "duplex_apartment",
  "villa",
  "duplex_villa",
  "building",
  "land",
  "shop",
  "showroom",
  "warehouse",
  "rest_house",
  "farm",
  "chalet",
  OTHER_OPTION,
] as const

export type PropertyTypeValue = (typeof PROPERTY_TYPE_VALUES)[number]

const LEGACY_ARABIC_TYPE_MAP: Record<string, PropertyTypeValue> = {
  شقة: "apartment",
  "شقة دوبلكس": "duplex_apartment",
  فيلا: "villa",
  "فيلا دوبلكس": "duplex_villa",
  عمارة: "building",
  أرض: "land",
  محل: "shop",
  معرض: "showroom",
  مستودع: "warehouse",
  استراحة: "rest_house",
  مزرعة: "farm",
  شاليه: "chalet",
  أخرى: OTHER_OPTION,
}

const LEGACY_ENGLISH_TYPE_MAP: Record<string, PropertyTypeValue> = {
  commercial: "shop",
}

export function normalizePropertyType(
  value: string | undefined | null
): PropertyTypeValue | string {
  if (!value) {
    return OTHER_OPTION
  }

  if ((PROPERTY_TYPE_VALUES as readonly string[]).includes(value)) {
    return value as PropertyTypeValue
  }

  return (
    LEGACY_ARABIC_TYPE_MAP[value] ??
    LEGACY_ENGLISH_TYPE_MAP[value] ??
    value
  )
}

export function isPropertyTypeOther(value: string | undefined | null): boolean {
  return normalizePropertyType(value) === OTHER_OPTION
}

export function isNeighborhoodOther(value: string | undefined | null): boolean {
  return value === NEIGHBORHOOD_OTHER_OPTION
}

/** @deprecated Use isPropertyTypeOther or isNeighborhoodOther for clarity. */
export function isOtherOption(value: string | undefined | null): boolean {
  return isPropertyTypeOther(value) || isNeighborhoodOther(value)
}

export function isLandType(type: string | undefined | null): boolean {
  return normalizePropertyType(type) === "land"
}

export function isBuildingType(type: string | undefined | null): boolean {
  return normalizePropertyType(type) === "building"
}

export function isVillaType(type: string | undefined | null): boolean {
  const normalized = normalizePropertyType(type)
  return normalized === "villa" || normalized === "duplex_villa"
}

export function isCommercialType(type: string | undefined | null): boolean {
  const normalized = normalizePropertyType(type)
  return (
    normalized === "shop" ||
    normalized === "showroom" ||
    normalized === "warehouse"
  )
}

export function isResidentialType(type: string | undefined | null): boolean {
  const normalized = normalizePropertyType(type)
  return (
    normalized === "apartment" ||
    normalized === "duplex_apartment" ||
    normalized === "villa" ||
    normalized === "duplex_villa" ||
    normalized === "rest_house" ||
    normalized === "farm" ||
    normalized === "chalet"
  )
}

export function shouldShowRooms(type: string | undefined | null): boolean {
  if (
    !type ||
    isLandType(type) ||
    isBuildingType(type) ||
    isCommercialType(type)
  ) {
    return false
  }

  return isResidentialType(type) || isPropertyTypeOther(type)
}

export function shouldShowAge(type: string | undefined | null): boolean {
  return Boolean(type && !isLandType(type))
}

export function shouldShowStreetWidth(type: string | undefined | null): boolean {
  return Boolean(type && !isLandType(type))
}

export function shouldShowLandFields(type: string | undefined | null): boolean {
  return isLandType(type)
}

export function shouldShowBuildingFields(type: string | undefined | null): boolean {
  return isBuildingType(type)
}

export function shouldShowAnnexField(type: string | undefined | null): boolean {
  return isVillaType(type)
}

export function isApartmentType(type: string | undefined | null): boolean {
  const normalized = normalizePropertyType(type)
  return normalized === "apartment" || normalized === "duplex_apartment"
}

export function shouldShowApartmentIdentityFields(
  type: string | undefined | null
): boolean {
  return isApartmentType(type)
}
