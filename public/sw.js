self.addEventListener("install", (event) => {
  // Activate immediately so push registration uses this worker.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

function isSafeInternalPath(path) {
  if (!path || typeof path !== "string") {
    return false
  }

  const trimmed = path.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return false
  }

  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return false
  }

  return true
}

function stableTag(title, url) {
  const raw = `${title || ""}|${url || ""}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i)
    hash |= 0
  }
  return `deerah-${Math.abs(hash)}`
}

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

        const rawUrl = payload.url ?? fallback.url
        const url = isSafeInternalPath(rawUrl) ? rawUrl : fallback.url

        await self.registration.showNotification(payload.title || fallback.title, {
          body: payload.body || "",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url },
          tag: stableTag(payload.title, url),
          renotify: true,
        })
      } catch (error) {
        console.error("[sw] push handler failed", error)

        await self.registration.showNotification(fallback.title, {
          body: fallback.body || "لديك إشعار جديد",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: fallback.url },
          tag: "deerah-fallback",
        })
      }
    })()
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || "/ar/dashboard"
  const targetUrl = isSafeInternalPath(rawUrl) ? rawUrl : "/ar/dashboard"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          try {
            const clientPath = new URL(client.url).pathname
            if (
              (clientPath === targetUrl ||
                clientPath.startsWith(targetUrl) ||
                client.url.includes(targetUrl)) &&
              "focus" in client
            ) {
              if ("navigate" in client && typeof client.navigate === "function") {
                try {
                  await client.navigate(targetUrl)
                } catch {
                  // Focus is enough if navigate is unsupported.
                }
              }
              return client.focus()
            }
          } catch {
            // Continue searching.
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }

        return undefined
      })
  )
})
