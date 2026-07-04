import webpush from "web-push"

import { createAdminClient } from "@/lib/supabase/admin"

export type CompanyPushPayload = {
  title: string
  body: string
  url?: string
}

type StoredPushSubscription = {
  endpoint?: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

type PushSubscriptionRow = {
  id: string
  user_id: string
  company_id: string
  endpoint: string
  subscription: StoredPushSubscription
}

const LOG_PREFIX = "[push]"

let vapidConfigured = false

function sanitizeVapidKey(rawKey: string): string {
  return rawKey.trim().replace(/^["']|["']$/g, "")
}

function ensureVapidConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ? sanitizeVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    : ""
  const privateKey = process.env.VAPID_PRIVATE_KEY
    ? sanitizeVapidKey(process.env.VAPID_PRIVATE_KEY)
    : ""
  const subject = (
    process.env.VAPID_SUBJECT ?? "mailto:support@real-estate-crm.local"
  ).trim()

  if (!publicKey || !privateKey) {
    console.error(`${LOG_PREFIX} VAPID keys missing`, {
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    })
    return false
  }

  if (!vapidConfigured) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      vapidConfigured = true
      console.log(`${LOG_PREFIX} VAPID configured`, {
        subject,
        publicKeyPrefix: publicKey.slice(0, 8),
      })
    } catch (error) {
      console.error(`${LOG_PREFIX} setVapidDetails failed`, error)
      return false
    }
  }

  return true
}

function getPushErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const webPushError = error as Error & {
      statusCode?: number
      body?: string
      endpoint?: string
    }

    return {
      message: webPushError.message,
      statusCode: webPushError.statusCode,
      body: webPushError.body,
      endpointHost: webPushError.endpoint
        ? safeEndpointHost(webPushError.endpoint)
        : undefined,
    }
  }

  return { message: String(error) }
}

function getPushErrorStatusCode(error: unknown): number | undefined {
  const details = getPushErrorDetails(error)
  return details.statusCode
}

function safeEndpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host
  } catch {
    return "invalid-endpoint"
  }
}

function toWebPushSubscription(
  row: PushSubscriptionRow
): webpush.PushSubscription | null {
  const stored = row.subscription ?? {}
  const endpoint = row.endpoint || stored.endpoint
  const p256dh = stored.keys?.p256dh
  const auth = stored.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    console.error(`${LOG_PREFIX} Invalid stored subscription shape`, {
      subscriptionId: row.id,
      userId: row.user_id,
      hasEndpoint: Boolean(endpoint),
      hasP256dh: Boolean(p256dh),
      hasAuth: Boolean(auth),
    })
    return null
  }

  return {
    endpoint,
    keys: { p256dh, auth },
  }
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
  console.log(`${LOG_PREFIX} broadcast start`, {
    companyId,
    excludeUserId,
    title: payload.title,
  })

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

    if (error) {
      console.error(`${LOG_PREFIX} subscription query failed`, {
        companyId,
        message: error.message,
        code: error.code,
      })
      return
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[]

    console.log(`${LOG_PREFIX} subscriptions fetched`, {
      companyId,
      excludeUserId,
      count: subscriptions.length,
      recipients: subscriptions.map((row) => ({
        subscriptionId: row.id,
        userId: row.user_id,
        endpointHost: safeEndpointHost(row.endpoint),
      })),
    })

    if (subscriptions.length === 0) {
      console.warn(`${LOG_PREFIX} no subscriptions to notify`, {
        companyId,
        excludeUserId,
      })
      return
    }

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/dashboard",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (row) => {
        const pushSubscription = toWebPushSubscription(row)

        if (!pushSubscription) {
          throw new Error(`Invalid subscription ${row.id}`)
        }

        const response = await webpush.sendNotification(pushSubscription, message, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        })

        console.log(`${LOG_PREFIX} sendNotification success`, {
          subscriptionId: row.id,
          userId: row.user_id,
          endpointHost: safeEndpointHost(pushSubscription.endpoint),
          statusCode: response.statusCode,
        })

        return response
      })
    )

    const staleIds: string[] = []

    results.forEach((result, index) => {
      const row = subscriptions[index]

      if (result.status === "fulfilled") {
        return
      }

      const details = getPushErrorDetails(result.reason)

      console.error(`${LOG_PREFIX} sendNotification failed`, {
        subscriptionId: row.id,
        userId: row.user_id,
        endpointHost: safeEndpointHost(row.endpoint),
        ...details,
      })

      const statusCode = details.statusCode
      if (statusCode === 410 || statusCode === 404) {
        staleIds.push(row.id)
      }
    })

    console.log(`${LOG_PREFIX} broadcast complete`, {
      companyId,
      attempted: subscriptions.length,
      succeeded: results.filter((result) => result.status === "fulfilled")
        .length,
      failed: results.filter((result) => result.status === "rejected").length,
      staleRemoved: staleIds.length,
    })

    if (staleIds.length > 0) {
      const { error: deleteError } = await adminClient
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds)

      if (deleteError) {
        console.error(`${LOG_PREFIX} stale subscription cleanup failed`, {
          message: deleteError.message,
          staleIds,
        })
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} broadcast crashed`, error)
  }
}
