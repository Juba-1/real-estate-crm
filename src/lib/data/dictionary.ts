import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  normalizeDictionaryValue,
  dictionarySimilarity,
  DICTIONARY_SIMILARITY_THRESHOLD,
} from "@/lib/dictionary-normalize"
import type {
  DictionaryCategory,
  DictionaryEntryRow,
  DictionaryStatus,
} from "@/types/dictionary"

const ENTRY_SELECT = `
  id,
  category,
  value,
  normalized_value,
  parent_value,
  status,
  usage_count,
  submitted_by,
  submitted_company_id,
  reviewed_by,
  reviewed_at,
  approved_at,
  rejection_note,
  created_at,
  updated_at
` as const

/**
 * Request-deduped approved catalog reads (React.cache).
 * Same values for all authenticated tenants (shared vocabulary).
 */
export const getApprovedDictionaryValues = cache(
  async (
    category: DictionaryCategory,
    parentValue?: string | null
  ): Promise<string[]> => {
    const supabase = await createClient()

    let query = supabase
      .from("dictionary_entries")
      .select("value")
      .eq("category", category)
      .eq("status", "approved")
      .order("value", { ascending: true })

    if (category === "district") {
      if (!parentValue) {
        return []
      }
      query = query.eq("parent_value", parentValue)
    }

    const { data, error } = await query

    if (error || !data) {
      return []
    }

    return data.map((row) => row.value)
  }
)


export async function findSimilarApprovedEntries(
  category: DictionaryCategory,
  value: string,
  parentValue?: string | null
): Promise<Array<{ id: string; value: string; similarity: number }>> {
  const supabase = await createClient()
  const normalized = normalizeDictionaryValue(value)

  let query = supabase
    .from("dictionary_entries")
    .select("id, value, normalized_value")
    .eq("category", category)
    .eq("status", "approved")

  if (category === "district" && parentValue) {
    query = query.eq("parent_value", parentValue)
  }

  const { data } = await query

  if (!data?.length) {
    return []
  }

  return data
    .map((row) => ({
      id: row.id,
      value: row.value,
      similarity: dictionarySimilarity(normalized, row.normalized_value),
    }))
    .filter((row) => row.similarity >= DICTIONARY_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
}

export async function getDictionaryEntriesForAdmin(filters?: {
  status?: DictionaryStatus | "all"
  category?: DictionaryCategory | "all"
}): Promise<DictionaryEntryRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from("dictionary_entries")
    .select(
      `
      ${ENTRY_SELECT},
      submitter:users!dictionary_entries_submitted_by_fkey ( name ),
      company:companies!dictionary_entries_submitted_company_id_fkey ( name )
    `
    )
    .order("created_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error("[dictionary] admin list failed", error)
    return []
  }

  return data.map((row) => {
    const submitter = Array.isArray(row.submitter)
      ? row.submitter[0]
      : row.submitter
    const company = Array.isArray(row.company) ? row.company[0] : row.company

    return {
      id: row.id,
      category: row.category,
      value: row.value,
      normalized_value: row.normalized_value,
      parent_value: row.parent_value,
      status: row.status,
      usage_count: row.usage_count,
      submitted_by: row.submitted_by,
      submitted_company_id: row.submitted_company_id,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      approved_at: row.approved_at,
      rejection_note: row.rejection_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      submitter_name: submitter?.name ?? null,
      company_name: company?.name ?? null,
    } as DictionaryEntryRow
  })
}

export async function countDictionaryReferences(params: {
  category: DictionaryCategory
  value: string
  parentValue?: string | null
}): Promise<{ properties: number; requests: number }> {
  const admin = createAdminClient()
  const value = params.value

  if (params.category === "property_type") {
    const [propsCustom, propsType, reqsCustom, reqsType] = await Promise.all([
      admin
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("custom_property_type", value),
      admin
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("type", value),
      admin
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("custom_property_type", value),
      admin
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("type", value),
    ])
    return {
      properties: (propsCustom.count ?? 0) + (propsType.count ?? 0),
      requests: (reqsCustom.count ?? 0) + (reqsType.count ?? 0),
    }
  }

  if (params.category === "city") {
    const [props, reqs] = await Promise.all([
      admin
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("city", value),
      admin
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("city", value),
    ])
    return {
      properties: props.count ?? 0,
      requests: reqs.count ?? 0,
    }
  }

  // district — match neighborhood or custom_neighborhood
  const cityFilter = params.parentValue?.trim()

  const propNeighborhood = admin
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood", value)
  const propCustom = admin
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("custom_neighborhood", value)
  const reqNeighborhood = admin
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood", value)
  const reqCustom = admin
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("custom_neighborhood", value)

  const [propsN, propsC, reqsN, reqsC] = await Promise.all([
    cityFilter ? propNeighborhood.eq("city", cityFilter) : propNeighborhood,
    cityFilter ? propCustom.eq("city", cityFilter) : propCustom,
    cityFilter ? reqNeighborhood.eq("city", cityFilter) : reqNeighborhood,
    cityFilter ? reqCustom.eq("city", cityFilter) : reqCustom,
  ])

  return {
    properties: (propsN.count ?? 0) + (propsC.count ?? 0),
    requests: (reqsN.count ?? 0) + (reqsC.count ?? 0),
  }
}
