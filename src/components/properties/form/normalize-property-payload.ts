import {
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import { insertPropertySchema } from "@/types/property"
import type { InsertPropertyInput } from "@/types/property"

type PropertyFormLike = {
  city: string
  type: string
  custom_property_type?: string | null
  [key: string]: unknown
}

/**
 * Pure prep for property form values before Zod + identity + save.
 * Keeps mega-form free of dictionary/city normalization rules.
 */
export function normalizePropertyFormPayload(
  values: PropertyFormLike,
  options: {
    customCity?: string
    isCityOther: (city: string) => boolean
  }
):
  | { ok: true; data: InsertPropertyInput }
  | { ok: false; code: "custom_city_required" | "invalid_fields" } {
  const payload: Record<string, unknown> = { ...values }

  if (options.isCityOther(String(payload.city))) {
    const nextCity = (options.customCity ?? "").trim()
    if (nextCity.length < 2) {
      return { ok: false, code: "custom_city_required" }
    }
    payload.city = nextCity
  }

  const type = String(payload.type ?? "")
  if (type && !(PROPERTY_TYPE_VALUES as readonly string[]).includes(type)) {
    payload.custom_property_type = type
    payload.type = "other"
  }

  const parsed = insertPropertySchema.safeParse(payload)
  if (!parsed.success) {
    return { ok: false, code: "invalid_fields" }
  }

  return { ok: true, data: parsed.data as InsertPropertyInput }
}
