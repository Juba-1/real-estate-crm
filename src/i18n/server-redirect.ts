import { getLocale } from "next-intl/server"
import { redirect as nextRedirect } from "next/navigation"

export async function redirectTo(href: string): Promise<never> {
  const locale = await getLocale()
  const normalized = href.startsWith("/") ? href : `/${href}`
  nextRedirect(`/${locale}${normalized}`)
}
