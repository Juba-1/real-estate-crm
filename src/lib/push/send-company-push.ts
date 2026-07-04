import webpush from "web-push"

import { createAdminClient } from "@/lib/supabase/admin"

export type CompanyPushPayload = {
  title: string
  body: string
  url?: string
}

type PushSubscriptionRow = {
  id: string
  user_id: string
  company_id: string
  endpoint: string
  subscription: webpush.PushSubscription
}

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject =
    process.env.VAPID_SUBJECT ?? "mailto:support@real-estate-crm.local"

  if (!publicKey || !privateKey) {
    return false
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
  }

  return true
}

function getPushErrorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode
  }

  return undefined
}

/**
 * Sends Web Push alerts to every subscription in `companyId`.
 * Uses admin client but ALWAYS filters by company_id for tenant isolation.
 */
export async function sendCompanyPushNotification(
  companyId: string,
  excludeUserId: string | null,
  payload: CompanyPushPayload
): Promise<void> {
  try {
    if (!ensureVapidConfigured()) {
      return
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from("push_subscriptions")
      .select("id, user_id, company_id, endpoint, subscription")
      .eq("company_id", companyId)

    if (excludeUserId) {
      query = query.neq("user_id", excludeUserId)
    }

    const { data, error } = await query

    if (error || !data?.length) {
      return
    }

    const subscriptions = data as PushSubscriptionRow[]
    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/dashboard",
    })

    const results = await Promise.allSettled(
      subscriptions.map((row) =>
        webpush.sendNotification(row.subscription, message)
      )
    )

    const staleIds = results.flatMap((result, index) => {
      if (result.status !== "rejected") {
        return []
      }

      const statusCode = getPushErrorStatusCode(result.reason)
      if (statusCode === 410 || statusCode === 404) {
        return [subscriptions[index].id]
      }

      return []
    })

    if (staleIds.length > 0) {
      await adminClient.from("push_subscriptions").delete().in("id", staleIds)
    }
  } catch {
    // Push delivery must never block the primary business action.
  }
}
