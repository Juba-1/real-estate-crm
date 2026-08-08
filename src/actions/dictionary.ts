"use server"

import { revalidatePath } from "next/cache"

import { requireSuperAdmin } from "@/lib/auth/super-admin"
import {
  countDictionaryReferences,
  findSimilarApprovedEntries,
} from "@/lib/data/dictionary"
import { normalizeDictionaryValue } from "@/lib/dictionary-normalize"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  reviewDictionarySchema,
  suggestDictionarySchema,
  type DictionaryCategory,
  type ReviewDictionaryInput,
  type SuggestDictionaryInput,
} from "@/types/dictionary"

export type SuggestDictionaryResult =
  | { ok: true; id?: string; skipped?: string; similar?: string[] }
  | { error: string }

export type ReviewDictionaryResult = { error: string } | null

function revalidateDictionaryPaths() {
  revalidatePath("/super-admin/dictionary")
  revalidatePath("/dashboard/add")
  revalidatePath("/dashboard/search")
  revalidatePath("/dashboard/requests")
}

/**
 * Best-effort suggestion. Never throws to callers — safe after primary saves.
 */
export async function suggestDictionaryEntry(
  input: SuggestDictionaryInput
): Promise<SuggestDictionaryResult> {
  const parsed = suggestDictionarySchema.safeParse(input)

  if (!parsed.success) {
    return { error: "Invalid suggestion." }
  }

  const value = normalizeDictionaryValue(parsed.data.value)
  const parentValue =
    parsed.data.category === "district"
      ? normalizeDictionaryValue(parsed.data.parent_value ?? "")
      : null

  if (value.length < 2) {
    return { ok: true, skipped: "too_short" }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { ok: true, skipped: "unauthenticated" }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return { ok: true, skipped: "no_company" }
    }

    // Exact match against active pending/approved (unique index).
    let existingQuery = supabase
      .from("dictionary_entries")
      .select("id, status, value")
      .eq("category", parsed.data.category)
      .eq("normalized_value", value)
      .in("status", ["pending", "approved"])
      .limit(1)

    if (parsed.data.category === "district") {
      existingQuery = existingQuery.eq("parent_value", parentValue)
    } else {
      existingQuery = existingQuery.is("parent_value", null)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    if (existing) {
      if (existing.status === "approved" || existing.status === "pending") {
        const admin = createAdminClient()
        const { data: row } = await admin
          .from("dictionary_entries")
          .select("usage_count")
          .eq("id", existing.id)
          .maybeSingle()

        if (row) {
          await admin
            .from("dictionary_entries")
            .update({ usage_count: (row.usage_count ?? 0) + 1 })
            .eq("id", existing.id)
        }

        return {
          ok: true,
          skipped:
            existing.status === "approved"
              ? "already_approved"
              : "already_pending",
          id: existing.id,
        }
      }
    }

    const similar = await findSimilarApprovedEntries(
      parsed.data.category,
      value,
      parentValue
    )

    // Still allow insert when similar exists — UI can warn; auto-skip only on exact.
    const { data: inserted, error } = await supabase
      .from("dictionary_entries")
      .insert({
        category: parsed.data.category,
        value,
        normalized_value: value,
        parent_value: parentValue,
        status: "pending",
        usage_count: 1,
        submitted_by: user.id,
        submitted_company_id: profile.company_id,
      })
      .select("id")
      .maybeSingle()

    if (error) {
      // Unique race — treat as success skip.
      if (error.code === "23505") {
        return { ok: true, skipped: "duplicate_race" }
      }
      console.error("[dictionary] suggest insert failed", error)
      return { ok: true, skipped: "insert_failed" }
    }

    return {
      ok: true,
      id: inserted?.id,
      similar: similar.map((item) => item.value),
    }
  } catch (error) {
    console.error("[dictionary] suggest crashed", error)
    return { ok: true, skipped: "error" }
  }
}

/** Fire suggestions for custom fields after a successful property/request save. */
export async function suggestFromListingFields(fields: {
  type?: string
  custom_property_type?: string | null
  city?: string
  neighborhood?: string | null
  custom_neighborhood?: string | null
  builtInCities: readonly string[]
  builtInPropertyTypes: readonly string[]
  isNeighborhoodOther: (value: string | null | undefined) => boolean
  isPropertyTypeOther: (value: string | null | undefined) => boolean
}): Promise<void> {
  const tasks: Promise<unknown>[] = []

  if (
    fields.isPropertyTypeOther(fields.type) &&
    fields.custom_property_type?.trim()
  ) {
    tasks.push(
      suggestDictionaryEntry({
        category: "property_type",
        value: fields.custom_property_type,
      })
    )
  }

  if (fields.city?.trim()) {
    const city = fields.city.trim()
    const isBuiltIn = fields.builtInCities.includes(city)
    if (!isBuiltIn) {
      tasks.push(
        suggestDictionaryEntry({
          category: "city",
          value: city,
        })
      )
    }
  }

  const districtRaw = fields.isNeighborhoodOther(fields.neighborhood)
    ? fields.custom_neighborhood
    : null

  if (districtRaw?.trim() && fields.city?.trim()) {
    tasks.push(
      suggestDictionaryEntry({
        category: "district",
        value: districtRaw,
        parent_value: fields.city,
      })
    )
  }

  await Promise.allSettled(tasks)
}

export async function reviewDictionaryEntry(
  input: ReviewDictionaryInput
): Promise<ReviewDictionaryResult> {
  const parsed = reviewDictionarySchema.safeParse(input)

  if (!parsed.success) {
    return { error: "Invalid review payload." }
  }

  const auth = await requireSuperAdmin()
  if ("error" in auth) {
    return { error: auth.error }
  }

  const admin = createAdminClient()
  const { data: entry, error: loadError } = await admin
    .from("dictionary_entries")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle()

  if (loadError || !entry) {
    return { error: loadError?.message ?? "Entry not found." }
  }

  const now = new Date().toISOString()
  const reviewerId = auth.user.id

  if (parsed.data.action === "delete") {
    const refs = await countDictionaryReferences({
      category: entry.category as DictionaryCategory,
      value: entry.value,
      parentValue: entry.parent_value,
    })

    if (refs.properties + refs.requests > 0 || entry.usage_count > 0) {
      return {
        error:
          "This value is referenced by listings or requests. Archive it instead of deleting.",
      }
    }

    const { error } = await admin
      .from("dictionary_entries")
      .delete()
      .eq("id", entry.id)

    if (error) {
      return { error: error.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  if (parsed.data.action === "merge") {
    if (!parsed.data.merge_into_id) {
      return { error: "Merge target is required." }
    }

    const { data: target } = await admin
      .from("dictionary_entries")
      .select("*")
      .eq("id", parsed.data.merge_into_id)
      .eq("status", "approved")
      .maybeSingle()

    if (!target) {
      return { error: "Merge target must be an approved entry." }
    }

    if (target.category !== entry.category) {
      return { error: "Cannot merge across categories." }
    }

    const { error: updateTarget } = await admin
      .from("dictionary_entries")
      .update({
        usage_count: (target.usage_count ?? 0) + (entry.usage_count ?? 0),
      })
      .eq("id", target.id)

    if (updateTarget) {
      return { error: updateTarget.message }
    }

    const { error: archiveSource } = await admin
      .from("dictionary_entries")
      .update({
        status: "archived",
        reviewed_by: reviewerId,
        reviewed_at: now,
        rejection_note: `Merged into ${target.value}`,
      })
      .eq("id", entry.id)

    if (archiveSource) {
      return { error: archiveSource.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  if (parsed.data.action === "edit") {
    const nextValue = normalizeDictionaryValue(parsed.data.value ?? entry.value)
    const nextParent =
      entry.category === "district"
        ? normalizeDictionaryValue(
            parsed.data.parent_value ?? entry.parent_value ?? ""
          )
        : null

    if (nextValue.length < 2) {
      return { error: "Value is too short." }
    }

    const { error } = await admin
      .from("dictionary_entries")
      .update({
        value: nextValue,
        normalized_value: nextValue,
        parent_value: nextParent || null,
      })
      .eq("id", entry.id)

    if (error) {
      return { error: error.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  if (parsed.data.action === "approve") {
    const nextValue = normalizeDictionaryValue(parsed.data.value ?? entry.value)
    const nextParent =
      entry.category === "district"
        ? normalizeDictionaryValue(
            parsed.data.parent_value ?? entry.parent_value ?? ""
          )
        : null

    const { error } = await admin
      .from("dictionary_entries")
      .update({
        value: nextValue,
        normalized_value: nextValue,
        parent_value: nextParent || null,
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: now,
        approved_at: now,
        rejection_note: null,
      })
      .eq("id", entry.id)

    if (error) {
      return { error: error.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  if (parsed.data.action === "reject") {
    const { error } = await admin
      .from("dictionary_entries")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: now,
        rejection_note: parsed.data.rejection_note ?? null,
      })
      .eq("id", entry.id)

    if (error) {
      return { error: error.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  if (parsed.data.action === "archive") {
    const { error } = await admin
      .from("dictionary_entries")
      .update({
        status: "archived",
        reviewed_by: reviewerId,
        reviewed_at: now,
      })
      .eq("id", entry.id)

    if (error) {
      return { error: error.message }
    }

    revalidateDictionaryPaths()
    return null
  }

  return { error: "Unknown action." }
}

export async function checkDictionarySimilarityAction(
  category: DictionaryCategory,
  value: string,
  parentValue?: string | null
): Promise<{ similar: Array<{ id: string; value: string; similarity: number }> }> {
  if (!value.trim()) {
    return { similar: [] }
  }

  const similar = await findSimilarApprovedEntries(category, value, parentValue)
  return { similar }
}

export async function loadCityOptionsAction(): Promise<string[]> {
  const { getCityOptions } = await import("@/lib/dictionary-catalog")
  return getCityOptions()
}

export async function loadDistrictOptionsAction(city: string): Promise<string[]> {
  const { getDistrictOptions } = await import("@/lib/dictionary-catalog")
  return getDistrictOptions(city)
}

export async function loadApprovedPropertyTypeLabelsAction(): Promise<string[]> {
  const { getApprovedDictionaryValues } = await import("@/lib/data/dictionary")
  return getApprovedDictionaryValues("property_type")
}
