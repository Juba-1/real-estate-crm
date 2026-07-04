function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function sanitizeVapidKey(rawKey: string): string {
  return rawKey.trim().replace(/^["']|["']$/g, "")
}

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) {
    return null
  }

  const sanitized = sanitizeVapidKey(key)
  return sanitized.length > 0 ? sanitized : null
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    type: "classic",
  })

  await navigator.serviceWorker.ready
  return registration
}

async function clearStalePushSubscription(
  registration: ServiceWorkerRegistration
): Promise<void> {
  const existing = await registration.pushManager.getSubscription()
  if (!existing) {
    return
  }

  try {
    await existing.unsubscribe()
  } catch {
    // Best effort — subscribe() below will surface a actionable error if needed.
  }
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  const vapidPublicKey = getVapidPublicKey()

  if (!vapidPublicKey) {
    throw new Error("MISSING_VAPID_PUBLIC_KEY")
  }

  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    return existing
  }

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as BufferSource,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error)

    if (
      message.includes("applicationserverkey") ||
      message.includes("invalid key") ||
      message.includes("not valid")
    ) {
      await clearStalePushSubscription(registration)

      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey
        ) as BufferSource,
      })
    }

    throw error
  }
}

export function serializePushSubscription(
  subscription: PushSubscription
): Record<string, unknown> {
  const json = subscription.toJSON()

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Push subscription is missing required keys.")
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  }
}

export function getPushClientErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "MISSING_VAPID_PUBLIC_KEY") {
      return "MISSING_VAPID"
    }

    const message = error.message.toLowerCase()

    if (
      message.includes("mime") ||
      message.includes("service worker") ||
      message.includes("script") ||
      message.includes("failed to register")
    ) {
      return "SERVICE_WORKER"
    }

    if (
      message.includes("applicationserverkey") ||
      message.includes("invalid key")
    ) {
      return "INVALID_VAPID"
    }

    return error.message
  }

  return "UNKNOWN"
}
