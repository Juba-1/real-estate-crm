import {
  EASTERN_CITY_NAMES,
  getNeighborhoodsForCity,
  SAUDI_EASTERN_CITIES,
} from "@/lib/constants/locations"
import {
  NEIGHBORHOOD_OTHER_OPTION,
  OTHER_OPTION,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import { getApprovedDictionaryValues } from "@/lib/data/dictionary"
import { CITY_OTHER_OPTION, isCityOther } from "@/lib/dictionary-ui"

export { CITY_OTHER_OPTION, isCityOther }

export async function getCityOptions(): Promise<string[]> {
  const approved = await getApprovedDictionaryValues("city")
  const merged = new Set<string>([...EASTERN_CITY_NAMES, ...approved])
  return [...merged].sort((a, b) => a.localeCompare(b, "ar"))
}

export async function getDistrictOptions(city: string): Promise<string[]> {
  if (!city || isCityOther(city)) {
    return [NEIGHBORHOOD_OTHER_OPTION]
  }

  const builtIn = getNeighborhoodsForCity(city).filter(
    (name) => name !== NEIGHBORHOOD_OTHER_OPTION
  )
  const approved = await getApprovedDictionaryValues("district", city)
  const merged = new Set<string>([...builtIn, ...approved])
  const list = [...merged].sort((a, b) => a.localeCompare(b, "ar"))
  list.push(NEIGHBORHOOD_OTHER_OPTION)
  return list
}

export async function getPropertyTypeSelectValues(): Promise<string[]> {
  const approved = await getApprovedDictionaryValues("property_type")
  return [
    ...PROPERTY_TYPE_VALUES.filter((v) => v !== OTHER_OPTION),
    ...approved,
    OTHER_OPTION,
  ]
}

export function isBuiltInCity(city: string): boolean {
  return EASTERN_CITY_NAMES.includes(city)
}

export function isKnownCity(
  city: string,
  approvedCities: readonly string[]
): boolean {
  return isBuiltInCity(city) || approvedCities.includes(city)
}

export { SAUDI_EASTERN_CITIES, EASTERN_CITY_NAMES, NEIGHBORHOOD_OTHER_OPTION }