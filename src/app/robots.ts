import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Authenticated product — keep crawlers off app shells.
      allow: ["/", "/ar", "/en"],
      disallow: ["/ar/dashboard", "/en/dashboard", "/ar/super-admin", "/en/super-admin", "/ar/login", "/en/login"],
    },
  }
}
