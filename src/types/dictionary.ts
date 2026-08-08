import { z } from "zod"

export const DICTIONARY_CATEGORIES = [
  "property_type",
  "city",
  "district",
] as const

export const dictionaryCategorySchema = z.enum(DICTIONARY_CATEGORIES)

export const DICTIONARY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "archived",
] as const

export const dictionaryStatusSchema = z.enum(DICTIONARY_STATUSES)

export type DictionaryCategory = z.infer<typeof dictionaryCategorySchema>
export type DictionaryStatus = z.infer<typeof dictionaryStatusSchema>

export const suggestDictionarySchema = z
  .object({
    category: dictionaryCategorySchema,
    value: z.string().trim().min(2).max(120),
    parent_value: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "district" && !data.parent_value?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "District suggestions require a parent city.",
        path: ["parent_value"],
      })
    }
  })

export type SuggestDictionaryInput = z.infer<typeof suggestDictionarySchema>

export const reviewDictionarySchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "approve",
    "reject",
    "archive",
    "delete",
    "edit",
    "merge",
  ]),
  value: z.string().trim().min(2).max(120).optional(),
  parent_value: z.string().trim().min(1).max(120).optional().nullable(),
  merge_into_id: z.string().uuid().optional(),
  rejection_note: z.string().trim().max(500).optional().nullable(),
})

export type ReviewDictionaryInput = z.infer<typeof reviewDictionarySchema>

export type DictionaryEntryRow = {
  id: string
  category: DictionaryCategory
  value: string
  normalized_value: string
  parent_value: string | null
  status: DictionaryStatus
  usage_count: number
  submitted_by: string | null
  submitted_company_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  approved_at: string | null
  rejection_note: string | null
  created_at: string
  updated_at: string
  submitter_name?: string | null
  company_name?: string | null
}
