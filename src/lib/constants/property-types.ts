export const OTHER_OPTION = "أخرى" as const

export const PROPERTY_TYPE_VALUES = [
  "شقة",
  "شقة دوبلكس",
  "فيلا",
  "فيلا دوبلكس",
  "عمارة",
  "أرض",
  "محل",
  "معرض",
  "مستودع",
  "استراحة",
  "مزرعة",
  "شاليه",
  OTHER_OPTION,
] as const

export type PropertyTypeValue = (typeof PROPERTY_TYPE_VALUES)[number]

export function isOtherOption(value: string | undefined | null): boolean {
  return value === OTHER_OPTION
}

export function isLandType(type: string | undefined | null): boolean {
  return type === "أرض"
}

export function isBuildingType(type: string | undefined | null): boolean {
  return type === "عمارة"
}

export function isVillaType(type: string | undefined | null): boolean {
  return type === "فيلا" || type === "فيلا دوبلكس"
}

export function isCommercialType(type: string | undefined | null): boolean {
  return (
    type === "محل" ||
    type === "معرض" ||
    type === "مستودع"
  )
}

export function isResidentialType(type: string | undefined | null): boolean {
  return (
    type === "شقة" ||
    type === "شقة دوبلكس" ||
    type === "فيلا" ||
    type === "فيلا دوبلكس" ||
    type === "استراحة" ||
    type === "مزرعة" ||
    type === "شاليه"
  )
}

export function shouldShowRooms(type: string | undefined | null): boolean {
  if (!type || isLandType(type) || isBuildingType(type) || isCommercialType(type)) {
    return false
  }

  return isResidentialType(type) || isOtherOption(type)
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
