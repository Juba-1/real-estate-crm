import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isCurrentlyUrgent } from "@/lib/urgent"
import type {
  RemovalReasonKey,
  RemovalRequestStatus,
} from "@/types/property-removal"
import type { OfferType, PropertyStatus, PropertyType } from "@/types/property"

export type PendingRemovalRequest = {
  id: string
  property_id: string | null
  requested_by: string
  reason_key: RemovalReasonKey
  reason_detail: string | null
  status: RemovalRequestStatus
  created_at: string
  requester_name: string
  property: {
    id: string
    type: PropertyType
    custom_property_type: string | null
    offer_type: OfferType
    city: string
    neighborhood: string
    status: PropertyStatus
    urgent_until: string | null
    is_urgent: boolean
  } | null
  opportunity_receipt_count: number
}

export async function getPendingPropertyRemovalRequests(): Promise<
  PendingRemovalRequest[]
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id || profile.role !== "admin") {
    return []
  }

  const { data, error } = await supabase
    .from("property_removal_requests")
    .select(
      `
      id,
      property_id,
      requested_by,
      reason_key,
      reason_detail,
      status,
      created_at,
      requester:users!property_removal_requests_requested_by_fkey ( name ),
      property:properties!property_removal_requests_property_id_fkey (
        id,
        type,
        custom_property_type,
        offer_type,
        city,
        neighborhood,
        status,
        urgent_until
      )
    `
    )
    .eq("company_id", profile.company_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error || !data) {
    console.error("[removal] list pending failed", error?.message)
    return []
  }

  const propertyIds = data
    .map((row) => row.property_id)
    .filter((id): id is string => Boolean(id))

  const receiptCounts = new Map<string, number>()
  if (propertyIds.length > 0) {
    const { data: receipts } = await supabase
      .from("opportunity_notification_receipts")
      .select("property_id")
      .eq("company_id", profile.company_id)
      .in("property_id", propertyIds)

    for (const row of receipts ?? []) {
      if (!row.property_id) continue
      receiptCounts.set(
        row.property_id,
        (receiptCounts.get(row.property_id) ?? 0) + 1
      )
    }
  }

  return data.map((row) => {
    const requester = Array.isArray(row.requester)
      ? row.requester[0]
      : row.requester
    const propertyRaw = Array.isArray(row.property)
      ? row.property[0]
      : row.property
    const property = propertyRaw
      ? {
          id: propertyRaw.id as string,
          type: propertyRaw.type as PropertyType,
          custom_property_type: (propertyRaw.custom_property_type as
            | string
            | null) ?? null,
          offer_type: propertyRaw.offer_type as OfferType,
          city: propertyRaw.city as string,
          neighborhood: propertyRaw.neighborhood as string,
          status: propertyRaw.status as PropertyStatus,
          urgent_until: (propertyRaw.urgent_until as string | null) ?? null,
          is_urgent: isCurrentlyUrgent(
            (propertyRaw.urgent_until as string | null) ?? null
          ),
        }
      : null

    return {
      id: row.id,
      property_id: row.property_id,
      requested_by: row.requested_by,
      reason_key: row.reason_key as RemovalReasonKey,
      reason_detail: row.reason_detail,
      status: row.status as RemovalRequestStatus,
      created_at: row.created_at,
      requester_name: requester?.name ?? "—",
      property,
      opportunity_receipt_count: row.property_id
        ? (receiptCounts.get(row.property_id) ?? 0)
        : 0,
    }
  })
}

export async function countPendingRemovalsForCompany(
  companyId: string
): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("property_removal_requests")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "pending")

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function countPendingRemovalsForAgent(
  companyId: string,
  agentId: string
): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("property_removal_requests")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("requested_by", agentId)
    .eq("status", "pending")

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function getPendingRemovalPropertyIdsForAgent(
  agentId: string
): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("property_removal_requests")
    .select("property_id")
    .eq("requested_by", agentId)
    .eq("status", "pending")
    .not("property_id", "is", null)

  if (error || !data) {
    return new Set()
  }

  return new Set(
    data
      .map((row) => row.property_id)
      .filter((id): id is string => Boolean(id))
  )
}
