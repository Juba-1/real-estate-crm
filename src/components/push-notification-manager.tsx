"use client"

import { BellRingIcon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import {
  removePushSubscription,
  savePushSubscription,
} from "@/actions/push-subscriptions"
import { Button } from "@/components/ui/button"
import {
  getPushClientErrorMessage,
  isPushSupported,
  registerPushServiceWorker,
  serializePushSubscription,
  subscribeToPush,
} from "@/lib/push/client"

type PushState = "unsupported" | "idle" | "enabled" | "denied"

function resolveClientError(
  error: unknown,
  t: ReturnType<typeof useTranslations<"pushNotifications">>
): string {
  const code = getPushClientErrorMessage(error)

  if (code === "MISSING_VAPID") {
    return t("missingVapid")
  }

  if (code === "SERVICE_WORKER") {
    return t("serviceWorkerFailed")
  }

  if (code === "INVALID_VAPID") {
    return t("invalidVapid")
  }

  if (code === "UNKNOWN") {
    return t("failed")
  }

  return code
}

export function PushNotificationManager() {
  const t = useTranslations("pushNotifications")
  const [state, setState] = useState<PushState>("idle")
  const [isBusy, setIsBusy] = useState(false)

  const syncExistingSubscription = useCallback(async () => {
    if (!isPushSupported()) {
      setState("unsupported")
      return
    }

    if (Notification.permission === "denied") {
      setState("denied")
      return
    }

    try {
      const registration = await registerPushServiceWorker()
      const existing = await registration.pushManager.getSubscription()

      if (existing) {
        const result = await savePushSubscription(
          serializePushSubscription(existing)
        )

        if (!result?.error) {
          setState("enabled")
          return
        }
      }
    } catch {
      // Ignore background sync errors; the user can opt in manually.
    }

    setState("idle")
  }, [])

  useEffect(() => {
    void syncExistingSubscription()
  }, [syncExistingSubscription])

  async function enablePushNotifications() {
    if (!isPushSupported()) {
      toast.error(t("unsupported"))
      return
    }

    setIsBusy(true)

    try {
      const permission = await Notification.requestPermission()

      if (permission === "denied") {
        setState("denied")
        toast.error(t("denied"))
        return
      }

      if (permission !== "granted") {
        setState("idle")
        return
      }

      const registration = await registerPushServiceWorker()
      const subscription = await subscribeToPush(registration)

      const result = await savePushSubscription(
        serializePushSubscription(subscription)
      )

      if (result?.error) {
        setState("idle")
        toast.error(result.error)
        return
      }

      setState("enabled")
      toast.success(t("enabled"))
    } catch (error) {
      setState("idle")
      toast.error(resolveClientError(error, t))
    } finally {
      setIsBusy(false)
    }
  }

  async function disablePushNotifications() {
    if (!isPushSupported()) {
      return
    }

    setIsBusy(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await removePushSubscription(endpoint)
      }

      setState("idle")
      toast.success(t("disabled"))
    } catch (error) {
      toast.error(resolveClientError(error, t))
    } finally {
      setIsBusy(false)
    }
  }

  if (state === "unsupported") {
    return null
  }

  if (state === "enabled") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 text-primary"
        onClick={() => void disablePushNotifications()}
        disabled={isBusy}
        title={t("disable")}
      >
        {isBusy ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <BellRingIcon className="size-4 fill-current" />
        )}
        <span className="sr-only">{t("disable")}</span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => void enablePushNotifications()}
      disabled={isBusy || state === "denied"}
      title={state === "denied" ? t("denied") : t("enable")}
    >
      {isBusy ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <BellRingIcon className="size-4" />
      )}
      <span className="sr-only">{t("enable")}</span>
    </Button>
  )
}
