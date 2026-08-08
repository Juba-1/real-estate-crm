import "server-only"

import webpush from "web-push"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
      category: "vapid_missing",
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
      console.error(`${LOG_PREFIX} setVapidDetails failed`, {
        category: "vapid_invalid",
        message: error instanceof Error ? error.message : String(error),
      })
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
      category: "invalid_subscription",
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
 * Sends Web Push alerts to subscriptions in `companyId`.
 * ALWAYS filters by company_id. Optional recipientUserIds narrows delivery.
 * Requires actor session + company bind before service-role fan-out.
 * Soft-fails — never throws to business callers.
 */
export async function sendCompanyPushNotification(
  companyId: string,
  actorUserId: string | null,
  payload: CompanyPushPayload,
  recipientUserIds?: string[]
): Promise<void> {
  console.log(`${LOG_PREFIX} broadcast start`, {
    category: "dispatch_attempted",
    companyId,
    actorUserId,
    title: payload.title,
    recipientFilter: recipientUserIds?.length ?? "company",
  })

  try {
    if (actorUserId) {
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user || user.id !== actorUserId) {
        console.error(`${LOG_PREFIX} rejected: actor session mismatch`, {
          category: "authz_rejected",
          companyId,
        })
        return
      }

      const { data: profile } = await supabase
        .from("users")
        .select("company_id, role")
        .eq("id", actorUserId)
        .maybeSingle()

      const isSuperAdmin = profile?.role === "super_admin"
      if (!profile || (!isSuperAdmin && profile.company_id !== companyId)) {
        console.error(`${LOG_PREFIX} rejected: company binding failed`, {
          category: "authz_rejected",
          companyId,
          actorUserId,
        })
        return
      }
    }

    if (!ensureVapidConfigured()) {
      return
    }

    const adminClient = createAdminClient()

    let query = adminClient
      .from("push_subscriptions")
      .select("id, user_id, company_id, endpoint, subscription")
      .eq("company_id", companyId)

    if (actorUserId) {
      query = query.neq("user_id", actorUserId)
    }

    if (recipientUserIds && recipientUserIds.length > 0) {
      query = query.in("user_id", recipientUserIds)
    }

    const { data, error } = await query

    if (error) {
      console.error(`${LOG_PREFIX} subscription query failed`, {
        category: "subscription_query_failed",
        companyId,
        message: error.message,
        code: error.code,
      })
      return
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[]

    if (subscriptions.length === 0) {
      console.warn(`${LOG_PREFIX} no subscriptions to notify`, {
        category: "no_subscriptions",
        companyId,
        actorUserId,
      })
      return
    }

    console.log(`${LOG_PREFIX} subscriptions fetched`, {
      category: "subscription_count",
      companyId,
      count: subscriptions.length,
    })

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/ar/dashboard",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (row) => {
        const pushSubscription = toWebPushSubscription(row)

        if (!pushSubscription) {
          throw new Error(`Invalid subscription ${row.id}`)
        }

        const response = await webpush.sendNotification(
          pushSubscription,
          message,
          {
            TTL: 60 * 60 * 24,
            urgency: "high",
          }
        )

        return response
      })
    )

    const staleIds: string[] = []
    let succeeded = 0
    let failed = 0

    results.forEach((result, index) => {
      const row = subscriptions[index]
      if (!row) {
        return
      }

      if (result.status === "fulfilled") {
        succeeded += 1
        return
      }

      failed += 1
      const details = getPushErrorDetails(result.reason)

      console.error(`${LOG_PREFIX} sendNotification failed`, {
        category: "send_failed",
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
      category: "dispatch_complete",
      companyId,
      subscriptionCount: subscriptions.length,
      succeeded,
      failed,
      staleRemoved: staleIds.length,
    })

    if (staleIds.length > 0) {
      const { error: deleteError } = await adminClient
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds)

      if (deleteError) {
        console.error(`${LOG_PREFIX} stale subscription cleanup failed`, {
          category: "stale_cleanup_failed",
          message: deleteError.message,
          staleCount: staleIds.length,
        })
      } else {
        console.log(`${LOG_PREFIX} stale subscriptions removed`, {
          category: "stale_removed",
          count: staleIds.length,
        })
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} broadcast crashed`, {
      category: "dispatch_crashed",
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
