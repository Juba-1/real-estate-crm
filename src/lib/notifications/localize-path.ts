/**
 * Prefix dashboard-relative paths with a locale for next-intl `localePrefix: "always"`.
 * Safe for Web Push / SW deep links and in-app notification link_path.
 */

const LOCALES = new Set(["ar", "en"])

export function localizeDashboardPath(
  locale: string,
  path: string
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const segments = normalized.split("/").filter(Boolean)
  const first = segments[0]

  if (first && LOCALES.has(first)) {
    return normalized
  }

  const safeLocale = LOCALES.has(locale) ? locale : "ar"
  return `/${safeLocale}${normalized === "/" ? "" : normalized}`
}

/**
 * Allow only same-app relative paths (no protocol, no // host).
 * Used by notification click handlers and service worker.
 */
export function isSafeInternalPath(path: string | null | undefined): boolean {
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
