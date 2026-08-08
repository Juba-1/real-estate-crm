"use server"

import { z } from "zod"

import {
  assessPropertyProgressiveReadiness,
  assessRequestProgressiveReadiness,
  resolveDistrictLabel,
} from "@/lib/intelligence/shared"
import {
  discoverFromPropertySide,
  discoverFromRequestSide,
} from "@/lib/intelligence/opportunities"
import {
  dispatchOpportunityNotifications,
  type PropertyNotifyInput,
  type RequestNotifyInput,
} from "@/lib/intelligence/opportunities/notify/dispatch"
import {
  loadPropertyOpportunityCandidates,
  loadRequestOpportunityCandidates,
} from "@/lib/data/intelligence/opportunities"
import { isNeighborhoodOther } from "@/lib/constants/property-types"
import { createClient } from "@/lib/supabase/server"
import {
  discoverOpportunitiesSchema,
  type DiscoverOpportunitiesResult,
} from "@/types/intelligence/opportunities"
import { OPPORTUNITY_ALGORITHM_VERSION } from "@/lib/intelligence/opportunities/config"

function resolveOpportunityDistrict(input: {
  neighborhood?: string
  custom_neighborhood?: string | null
}): string {
  return resolveDistrictLabel({
    neighborhood: input.neighborhood || "",
    custom_neighborhood: input.custom_neighborhood,
    isNeighborhoodOther,
  })
}

/**
 * Live opportunity discovery — read-only, company-scoped.
 * Never sends notifications (ADR-022 / 5B: notify only on save).
 */
export async function discoverOpportunities(
  raw: unknown
): Promise<DiscoverOpportunitiesResult> {
  try {
    const parsed = discoverOpportunitiesSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        opportunities: [],
        grouped: {},
        readiness: {
          ready: false,
          missing: ["invalid"],
          strength: "none",
          debounceMs: 600,
        },
        empty: {
          code: "insufficient_input",
          missing: ["invalid"],
          nextStep: "enter_more",
        },
        algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
      }
    }

    const input = parsed.data
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return emptyAuthResult()
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return emptyAuthResult()
    }

    const companyId = profile.company_id

    if (input.direction === "property_to_requests") {
      const readiness = assessPropertyProgressiveReadiness({
        type: input.type,
        city: input.city,
        neighborhood: input.neighborhood,
        area: input.area,
        price: input.price,
      })

      if (!readiness.ready || !input.city || !input.type) {
        return {
          opportunities: [],
          grouped: {},
          readiness,
          empty: {
            code: "insufficient_input",
            missing: readiness.missing,
            nextStep: readiness.missing.includes("city")
              ? "enter_city"
              : "enter_type",
          },
          algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
        }
      }

      const district = resolveOpportunityDistrict({
        neighborhood: input.neighborhood || "",
        custom_neighborhood: input.custom_neighborhood,
      })

      const candidates = await loadRequestOpportunityCandidates(companyId, {
        type: input.type,
        city: input.city,
        district: district || undefined,
        excludeId: input.exclude_id,
      })

      return discoverFromPropertySide(
        {
          type: input.type,
          offer_type: input.offer_type,
          city: input.city,
          district: district || undefined,
          area: input.area,
          price: input.price,
        },
        candidates,
        readiness
      )
    }

    // request_to_properties
    const readiness = assessRequestProgressiveReadiness({
      type: input.type,
      city: input.city,
      neighborhood: input.neighborhood,
      area_min: input.area_min,
      area_max: input.area_max,
      budget_min: input.budget_min,
      budget_max: input.budget_max,
    })

    if (!readiness.ready || !input.city || !input.type) {
      return {
        opportunities: [],
        grouped: {},
        readiness,
        empty: {
          code: "insufficient_input",
          missing: readiness.missing,
          nextStep: readiness.missing.includes("city")
            ? "enter_city"
            : "enter_type",
        },
        algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
      }
    }

    const district = input.neighborhood
      ? resolveOpportunityDistrict({
          neighborhood: input.neighborhood,
          custom_neighborhood: input.custom_neighborhood,
        })
      : ""

    const candidates = await loadPropertyOpportunityCandidates(companyId, {
      type: input.type,
      city: input.city,
      excludeId: input.exclude_id,
    })

    return discoverFromRequestSide(
      {
        type: input.type,
        offer_type: input.offer_type,
        city: input.city,
        district: district || undefined,
        area_min: input.area_min,
        area_max: input.area_max,
        budget_min: input.budget_min,
        budget_max: input.budget_max,
      },
      candidates,
      readiness
    )
  } catch (error) {
    console.error("[opportunities] discover crashed", error)
    return emptyAuthResult()
  }
}

function emptyAuthResult(): DiscoverOpportunitiesResult {
  return {
    opportunities: [],
    grouped: {},
    readiness: {
      ready: false,
      missing: ["auth"],
      strength: "none",
      debounceMs: 600,
    },
    empty: { code: "insufficient_input", missing: ["auth"] },
    algorithm_version: OPPORTUNITY_ALGORITHM_VERSION,
  }
}

const opportunityNotifyPayloadSchema = z.object({
  trigger: z.enum(["property_saved", "request_saved"]),
  companyId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  property: z
    .object({
      id: z.string().uuid(),
      type: z.string(),
      offer_type: z.string().optional(),
      city: z.string(),
      neighborhood: z.string().optional(),
      custom_neighborhood: z.string().nullable().optional(),
      area: z.number().nullable().optional(),
      price: z.number().nullable().optional(),
    })
    .optional()
    .nullable(),
  request: z
    .object({
      id: z.string().uuid(),
      type: z.string(),
      offer_type: z.string().optional(),
      city: z.string(),
      neighborhood: z.string().nullable().optional(),
      custom_neighborhood: z.string().nullable().optional(),
      budget_min: z.number().nullable().optional(),
      budget_max: z.number().nullable().optional(),
      area_min: z.number().nullable().optional(),
      area_max: z.number().nullable().optional(),
    })
    .optional()
    .nullable(),
})

/**
 * Smart opportunity notifications (Release 5B).
 * Fire-and-forget after save — never blocks listing/request writes.
 * Live typing discovery remains silent (ADR-022).
 */
export async function notifyOpportunityDiscovery(
  raw: unknown
): Promise<void> {
  try {
    const parsed = opportunityNotifyPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      console.error("[opp-notify] invalid payload")
      return
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== parsed.data.actorUserId) {
      console.error("[opp-notify] rejected: actor session mismatch")
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id || profile.company_id !== parsed.data.companyId) {
      console.error("[opp-notify] rejected: company binding failed")
      return
    }

    await dispatchOpportunityNotifications({
      trigger: parsed.data.trigger,
      companyId: parsed.data.companyId,
      actorUserId: parsed.data.actorUserId,
      property: parsed.data.property as PropertyNotifyInput | null | undefined,
      request: parsed.data.request as RequestNotifyInput | null | undefined,
    })
  } catch (error) {
    console.error("[opp-notify] notifyOpportunityDiscovery crashed", error)
  }
}
