"use server"

import { IDENTITY_VERSION } from "@/lib/intelligence/identity"
import { analyzePropertyIdentity } from "@/lib/intelligence/identity"
import {
  loadIdentityCandidates,
  upsertPropertyIdentity,
} from "@/lib/data/intelligence/identity"
import { upsertRequestIdentity } from "@/lib/data/intelligence/opportunities"
import { createClient } from "@/lib/supabase/server"
import {
  logIdentityEventSchema,
  type AnalyzeIdentityResult,
  type IdentityOverride,
  type LogIdentityEventInput,
} from "@/types/intelligence/identity"
import type { InsertPropertyInput } from "@/types/property"
import type { InsertRequestInput } from "@/types/request"

export type CheckIdentityResult =
  | AnalyzeIdentityResult
  | { error: string; matches: []; warn: false; identity_version: number }

function toDnaInput(data: InsertPropertyInput) {
  return {
    type: data.type,
    city: data.city,
    neighborhood: data.neighborhood,
    custom_neighborhood: data.custom_neighborhood,
    area: data.area,
    plot_letter: data.plot_letter,
    google_maps_url: data.google_maps_url,
    specs: data.specs,
  }
}

/**
 * Dry-run identity analysis — no listing write.
 * Never throws to the client; on failure returns warn:false so save can continue.
 */
export async function checkPropertyIdentity(
  data: InsertPropertyInput,
  excludePropertyId?: string | null
): Promise<CheckIdentityResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        error: "unauthenticated",
        matches: [],
        warn: false,
        identity_version: IDENTITY_VERSION,
      }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return {
        error: "no_company",
        matches: [],
        warn: false,
        identity_version: IDENTITY_VERSION,
      }
    }

    const input = toDnaInput(data)
    const candidates = await loadIdentityCandidates(
      profile.company_id,
      input,
      excludePropertyId
    )

    return analyzePropertyIdentity(input, candidates)
  } catch (error) {
    console.error("[identity] check crashed", error)
    return {
      error: "check_failed",
      matches: [],
      warn: false,
      identity_version: IDENTITY_VERSION,
    }
  }
}

export async function logIdentityEvent(
  input: LogIdentityEventInput
): Promise<{ error: string } | null> {
  const parsed = logIdentityEventSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Invalid event." }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "unauthenticated" }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return { error: "no_company" }
    }

    const { error } = await supabase.from("intelligence_events").insert({
      company_id: profile.company_id,
      domain: "identity",
      event_type: parsed.data.event_type,
      entity_id: parsed.data.entity_id ?? null,
      related_entity_id: parsed.data.related_entity_id ?? null,
      confidence: parsed.data.confidence ?? null,
      algorithm_version: IDENTITY_VERSION,
      payload: parsed.data.payload ?? {},
      created_by: user.id,
    })

    if (error) {
      console.error("[identity] log event failed", error)
      return null
    }

    return null
  } catch (error) {
    console.error("[identity] log event crashed", error)
    return null
  }
}

/** Called after successful property create/update — never throws. */
export async function persistPropertyIdentityAfterSave(
  propertyId: string,
  companyId: string,
  data: InsertPropertyInput,
  override?: IdentityOverride | null
): Promise<void> {
  await upsertPropertyIdentity(propertyId, companyId, toDnaInput(data))

  if (override?.acknowledged) {
    await logIdentityEvent({
      event_type: "continue_anyway",
      entity_id: propertyId,
      related_entity_id: override.match_property_id ?? null,
      confidence: override.confidence ?? null,
      payload: {
        confidence_breakdown: true,
      },
    })
  }
}

/** Persist request DNA after save — identity domain owns this write path. */
export async function persistRequestIdentityAfterSave(
  requestId: string,
  companyId: string,
  data: InsertRequestInput
): Promise<void> {
  await upsertRequestIdentity(requestId, companyId, {
    type: data.type,
    offer_type: data.offer_type,
    city: data.city,
    neighborhood: data.neighborhood,
    custom_neighborhood: data.custom_neighborhood,
    budget_min: data.budget_min,
    budget_max: data.budget_max,
    area_min: data.area_min,
    area_max: data.area_max,
  })
}
