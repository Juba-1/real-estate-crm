import "server-only"

import { decideOpportunityNotify } from "@/lib/intelligence/opportunities/notify/anti-spam"
import {
  buildGroupedOpportunityCopy,
  formatMatchedReasonsAr,
} from "@/lib/intelligence/opportunities/notify/copy"
import {
  MAX_GROUPED_OPPORTUNITIES,
  OPPORTUNITY_NOTIFY_VERSION,
  PRIORITY_RANK,
  opportunityFingerprint,
  type NotificationPriority,
  type OpportunityNotifyEventType,
} from "@/lib/intelligence/opportunities/notify/policy"
import { scorePropertyRequestOpportunity } from "@/lib/intelligence/opportunities/score"
import {
  loadPropertyOpportunityCandidates,
  loadRequestOpportunityCandidates,
} from "@/lib/data/intelligence/opportunities"
import {
  loadOpportunityReceipts,
  logOpportunityNotifyEvent,
  upsertOpportunityReceipt,
} from "@/lib/data/intelligence/opportunity-notify"
import { notifyCompanyUsers } from "@/lib/notifications/notify-company"
import { sendCompanyPushNotification } from "@/lib/push/send-company-push"
import { resolveDistrictLabel } from "@/lib/intelligence/shared"
import { isNeighborhoodOther } from "@/lib/constants/property-types"
import type { OpportunityReason } from "@/types/intelligence/opportunities"
import type { OpportunityLevel } from "@/types/intelligence/opportunities"

export type OpportunityNotifyTrigger =
  | "property_saved"
  | "request_saved"

export type PropertyNotifyInput = {
  id: string
  type: string
  offer_type?: string
  city: string
  neighborhood?: string
  custom_neighborhood?: string | null
  area?: number | null
  price?: number | null
}

export type RequestNotifyInput = {
  id: string
  type: string
  offer_type?: string
  city: string
  neighborhood?: string | null
  custom_neighborhood?: string | null
  budget_min?: number | null
  budget_max?: number | null
  area_min?: number | null
  area_max?: number | null
}

type PendingMatch = {
  fingerprint: string
  propertyId: string
  requestId: string
  recipientUserId: string
  confidence: number
  level: OpportunityLevel
  priority: NotificationPriority
  eventType: OpportunityNotifyEventType
  reasons: OpportunityReason[]
  city: string
  typeLabel: string
  direction: "property_to_requests" | "request_to_properties"
}

/**
 * Post-save opportunity notifications.
 * Scores only company-scoped candidates for the affected entity — never full DB.
 * Never throws; never blocks the primary save.
 */
export async function dispatchOpportunityNotifications(params: {
  trigger: OpportunityNotifyTrigger
  companyId: string
  actorUserId: string
  property?: PropertyNotifyInput | null
  request?: RequestNotifyInput | null
}): Promise<void> {
  try {
    const pending = await collectPendingMatches(params)
    if (pending.length === 0) {
      return
    }

    // Group by recipient to avoid flooding
    const byRecipient = new Map<string, PendingMatch[]>()
    for (const match of pending) {
      const list = byRecipient.get(match.recipientUserId) ?? []
      list.push(match)
      byRecipient.set(match.recipientUserId, list)
    }

    for (const [recipientUserId, matches] of byRecipient) {
      if (recipientUserId === params.actorUserId) {
        continue
      }

      const sorted = [...matches].sort((a, b) => b.confidence - a.confidence)
      const top = sorted.slice(0, MAX_GROUPED_OPPORTUNITIES)
      const bestPriority = top.reduce(
        (best, m) =>
          PRIORITY_RANK[m.priority] > PRIORITY_RANK[best] ? m.priority : best,
        top[0]!.priority
      )
      const primaryEvent = top[0]!.eventType
      const reasonsSummary = formatMatchedReasonsAr(top[0]!.reasons)
      const copy = buildGroupedOpportunityCopy({
        priority: bestPriority,
        eventType: primaryEvent,
        count: top.length,
        topConfidence: top[0]!.confidence,
        city: top[0]!.city,
        typeLabel: top[0]!.typeLabel,
        reasonsSummary,
        direction: top[0]!.direction,
      })

      await notifyCompanyUsers({
        actorUserId: params.actorUserId,
        companyId: params.companyId,
        recipientUserIds: [recipientUserId],
        title: copy.title,
        message: copy.message,
        linkPath: copy.linkPath,
      })

      await sendCompanyPushNotification(
        params.companyId,
        params.actorUserId,
        {
          title: copy.title,
          body: copy.message,
          url: copy.linkPath,
        },
        [recipientUserId]
      )

      for (const match of top) {
        await upsertOpportunityReceipt({
          companyId: params.companyId,
          fingerprint: match.fingerprint,
          propertyId: match.propertyId,
          requestId: match.requestId,
          recipientUserId,
          confidence: match.confidence,
          priority: match.priority,
          level: match.level,
          eventType: match.eventType,
        })

        void logOpportunityNotifyEvent({
          companyId: params.companyId,
          actorUserId: params.actorUserId,
          propertyId: match.propertyId,
          requestId: match.requestId,
          recipientUserId,
          confidence: match.confidence,
          priority: match.priority,
          eventType: match.eventType,
          reasons: match.reasons,
        })
      }
    }

    console.log("[opp-notify] dispatched", {
      trigger: params.trigger,
      companyId: params.companyId,
      recipients: byRecipient.size,
      matches: pending.length,
      version: OPPORTUNITY_NOTIFY_VERSION,
    })
  } catch (error) {
    console.error("[opp-notify] dispatch crashed", error)
  }
}

async function collectPendingMatches(params: {
  trigger: OpportunityNotifyTrigger
  companyId: string
  actorUserId: string
  property?: PropertyNotifyInput | null
  request?: RequestNotifyInput | null
}): Promise<PendingMatch[]> {
  const pending: PendingMatch[] = []

  if (params.trigger === "property_saved" && params.property) {
    const property = params.property
    const district = resolveDistrictLabel({
      neighborhood: property.neighborhood || "",
      custom_neighborhood: property.custom_neighborhood,
      isNeighborhoodOther,
    })

    const requests = await loadRequestOpportunityCandidates(params.companyId, {
      type: property.type,
      city: property.city,
      district: district || undefined,
      excludeId: null,
    })

    const scored: Array<{
      request: (typeof requests)[number]
      confidence: number
      level: OpportunityLevel
      reasons: OpportunityReason[]
      fingerprint: string
    }> = []

    for (const request of requests) {
      const result = scorePropertyRequestOpportunity(property, request)
      scored.push({
        request,
        confidence: result.confidence,
        level: result.level,
        reasons: result.reasons,
        fingerprint: opportunityFingerprint(property.id, request.id),
      })
    }

    const byAgent = new Map<string, typeof scored>()
    for (const item of scored) {
      const list = byAgent.get(item.request.agent_id) ?? []
      list.push(item)
      byAgent.set(item.request.agent_id, list)
    }

    for (const [agentId, items] of byAgent) {
      const loaded = await loadOpportunityReceipts({
        companyId: params.companyId,
        fingerprints: items.map((i) => i.fingerprint),
        recipientUserId: agentId,
      })
      // Fail closed: never spam when anti-spam receipts cannot be loaded.
      if (!loaded.ok) continue

      for (const item of items) {
        const decision = decideOpportunityNotify({
          confidence: item.confidence,
          level: item.level,
          receipt: loaded.receipts.get(item.fingerprint) ?? null,
        })
        if (!decision.notify) continue

        pending.push({
          fingerprint: item.fingerprint,
          propertyId: property.id,
          requestId: item.request.id,
          recipientUserId: agentId,
          confidence: item.confidence,
          level: item.level,
          priority: decision.priority,
          eventType: decision.eventType,
          reasons: item.reasons,
          city: property.city,
          typeLabel: property.type,
          direction: "property_to_requests",
        })
      }
    }
  }

  if (params.trigger === "request_saved" && params.request) {
    const request = params.request
    const properties = await loadPropertyOpportunityCandidates(
      params.companyId,
      {
        type: request.type,
        city: request.city,
        excludeId: null,
      }
    )

    const scored: Array<{
      property: (typeof properties)[number]
      confidence: number
      level: OpportunityLevel
      reasons: OpportunityReason[]
      fingerprint: string
    }> = []

    for (const property of properties) {
      const result = scorePropertyRequestOpportunity(property, {
        type: request.type,
        offer_type: request.offer_type,
        city: request.city,
        district: resolveDistrictLabel({
          neighborhood: request.neighborhood || "",
          custom_neighborhood: request.custom_neighborhood,
          isNeighborhoodOther,
        }),
        area_min: request.area_min,
        area_max: request.area_max,
        budget_min: request.budget_min,
        budget_max: request.budget_max,
      })
      scored.push({
        property,
        confidence: result.confidence,
        level: result.level,
        reasons: result.reasons,
        fingerprint: opportunityFingerprint(property.id, request.id),
      })
    }

    const byAgent = new Map<string, typeof scored>()
    for (const item of scored) {
      const list = byAgent.get(item.property.agent_id) ?? []
      list.push(item)
      byAgent.set(item.property.agent_id, list)
    }

    for (const [agentId, items] of byAgent) {
      const loaded = await loadOpportunityReceipts({
        companyId: params.companyId,
        fingerprints: items.map((i) => i.fingerprint),
        recipientUserId: agentId,
      })
      if (!loaded.ok) continue

      for (const item of items) {
        const decision = decideOpportunityNotify({
          confidence: item.confidence,
          level: item.level,
          receipt: loaded.receipts.get(item.fingerprint) ?? null,
        })
        if (!decision.notify) continue

        pending.push({
          fingerprint: item.fingerprint,
          propertyId: item.property.id,
          requestId: request.id,
          recipientUserId: agentId,
          confidence: item.confidence,
          level: item.level,
          priority: decision.priority,
          eventType: decision.eventType,
          reasons: item.reasons,
          city: request.city,
          typeLabel: request.type,
          direction: "request_to_properties",
        })
      }
    }
  }

  return pending
}
