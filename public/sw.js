self.addEventListener("install", (event) => {
  // Activate immediately so push registration uses this worker.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  const fallback = {
    title: "إشعار جديد",
    body: "",
    url: "/ar/dashboard",
  }

  event.waitUntil(
    (async () => {
      let payload = { ...fallback }

      try {
        if (!event.data) {
          console.warn("[sw] push event received with no data")
        } else {
          const text = event.data.text()

          try {
            payload = { ...fallback, ...JSON.parse(text) }
          } catch {
            payload.body = text
          }
        }

        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: payload.url ?? "/ar/dashboard" },
          tag: `real-estate-crm-${Date.now()}`,
        })
      } catch (error) {
        console.error("[sw] push handler failed", error)

        await self.registration.showNotification(fallback.title, {
          body: fallback.body || "لديك إشعار جديد",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: fallback.url },
        })
      }
    })()
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || "/ar/dashboard"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus()
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }

        return undefined
      })
  )
})
