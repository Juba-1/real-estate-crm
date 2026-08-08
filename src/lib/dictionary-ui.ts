/** Client-safe dictionary UI sentinels (no server imports). */

export const CITY_OTHER_OPTION = "other" as const

export function isCityOther(value: string | undefined | null): boolean {
  return value === CITY_OTHER_OPTION
}
