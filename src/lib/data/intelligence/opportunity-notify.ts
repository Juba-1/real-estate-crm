import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { NotificationPriority } from "@/lib/intelligence/opportunities/notify/policy"
import type { ReceiptSnapshot } from "@/lib/intelligence/opportunities/notify/anti-spam"

export type OpportunityReceiptsResult =
  | { ok: true; receipts: Map<string, ReceiptSnapshot> }
  | { ok: false }

/**
 * Loads anti-spam receipts. On query failure returns `{ ok: false }` so callers
 * fail closed (skip notify) instead of treating missing data as first-time.
 */
export async function loadOpportunityReceipts(params: {
  companyId: string
  fingerprints: string[]
  recipientUserId: string
}): Promise<OpportunityReceiptsResult> {
  const receipts = new Map<string, ReceiptSnapshot>()
  if (params.fingerprints.length === 0) {
    return { ok: true, receipts }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("opportunity_notification_receipts")
    .select(
      "fingerprint, last_confidence, last_priority, last_notified_at"
    )
    .eq("company_id", params.companyId)
    .eq("recipient_user_id", params.recipientUserId)
    .in("fingerprint", params.fingerprints)

  if (error || !data) {
    console.error("[opp-notify] load receipts failed", error?.message)
    return { ok: false }
  }

  for (const row of data) {
    receipts.set(row.fingerprint, {
      last_confidence: Number(row.last_confidence),
      last_priority: row.last_priority as NotificationPriority,
      last_notified_at: row.last_notified_at,
    })
  }

  return { ok: true, receipts }
}

export async function upsertOpportunityReceipt(params: {
  companyId: string
  fingerprint: string
  propertyId: string
  requestId: string
  recipientUserId: string
  confidence: number
  priority: NotificationPriority
  level: string
  eventType: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from("opportunity_notification_receipts").upsert(
      {
        company_id: params.companyId,
        fingerprint: params.fingerprint,
        property_id: params.propertyId,
        request_id: params.requestId,
        recipient_user_id: params.recipientUserId,
        last_confidence: params.confidence,
        last_priority: params.priority,
        last_level: params.level,
        last_event_type: params.eventType,
        last_notified_at: new Date().toISOString(),
      },
      { onConflict: "company_id,fingerprint,recipient_user_id" }
    )

    if (error) {
      console.error("[opp-notify] upsert receipt failed", error.message)
    }
  } catch (error) {
    console.error("[opp-notify] upsert receipt crashed", error)
  }
}

export async function logOpportunityNotifyEvent(params: {
  companyId: string
  actorUserId: string
  propertyId: string
  requestId: string
  recipientUserId: string
  confidence: number
  priority: string
  eventType: string
  reasons: unknown
}): Promise<void> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("intelligence_events").insert({
      company_id: params.companyId,
      domain: "matching",
      event_type: `opportunity_notify_${params.eventType}`,
      entity_id: params.propertyId,
      related_entity_id: params.requestId,
      created_by: params.actorUserId,
      confidence: params.confidence,
      payload: {
        recipient_user_id: params.recipientUserId,
        priority: params.priority,
        reasons: params.reasons,
      },
    })

    if (error) {
      console.error("[opp-notify] intelligence event failed", error.message)
    }
  } catch (error) {
    console.error("[opp-notify] intelligence event crashed", error)
  }
}
