import type { MetadataRoute } from "next"

/**
 * Public marketing URLs only. Dashboard routes are auth-gated and omitted.
 * Set NEXT_PUBLIC_APP_URL in production for absolute sitemap URLs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"

  const locales = ["ar", "en"] as const
  const publicPaths = ["", "/login"] as const

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const path of publicPaths) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.6,
      })
    }
  }

  return entries
}
