import createIntlMiddleware from "next-intl/middleware"
import { type NextRequest, NextResponse } from "next/server"

import { routing } from "@/i18n/routing"
import {
  isGateCompanyActive,
  loadMiddlewareGateProfile,
  postLoginPathForRole,
} from "@/lib/auth/middleware-gate"
import { updateSession } from "@/lib/supabase/middleware"

const handleI18nRouting = createIntlMiddleware(routing)

function getLocaleFromPathname(pathname: string) {
  const locale = pathname.split("/")[1]

  if (locale && routing.locales.includes(locale as "ar" | "en")) {
    return locale
  }

  return routing.defaultLocale
}

function getPathnameWithoutLocale(pathname: string) {
  const locale = pathname.split("/")[1]

  if (locale && routing.locales.includes(locale as "ar" | "en")) {
    const stripped = pathname.slice(locale.length + 1)
    return stripped.length > 0 ? stripped : "/"
  }

  return pathname
}

function localizedPath(locale: string, pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `/${locale}${normalized === "/" ? "" : normalized}`
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }
  const redirectResponse = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })
  return redirectResponse
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api")) {
    const response = NextResponse.next()
    await updateSession(request, response)
    return response
  }

  const intlResponse = handleI18nRouting(request)

  if (intlResponse.headers.get("location")) {
    const { response } = await updateSession(request, intlResponse)
    return response
  }

  const { response, user } = await updateSession(request, intlResponse)
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname)
  const locale = getLocaleFromPathname(pathname)

  const isProtectedRoute =
    pathnameWithoutLocale.startsWith("/dashboard") ||
    pathnameWithoutLocale.startsWith("/super-admin") ||
    pathnameWithoutLocale.startsWith("/admin")
  const isLoginRoute = pathnameWithoutLocale === "/login"

  if (!user && isProtectedRoute) {
    return redirectWithCookies(
      request,
      response,
      localizedPath(locale, "/login")
    )
  }

  const needsGate =
    Boolean(user) &&
    (isLoginRoute ||
      pathnameWithoutLocale.startsWith("/dashboard") ||
      pathnameWithoutLocale.startsWith("/super-admin"))

  if (!user || !needsGate) {
    return response
  }

  const gate = await loadMiddlewareGateProfile(request, response, user.id)
  if (!gate?.profile) {
    return response
  }

  const { supabase, profile } = gate

  if (!isGateCompanyActive(profile)) {
    await supabase.auth.signOut()
    return redirectWithCookies(
      request,
      response,
      localizedPath(locale, "/login"),
      { error: "inactive_company" }
    )
  }

  const postLoginPath = postLoginPathForRole(profile.role)

  if (isLoginRoute) {
    return redirectWithCookies(
      request,
      response,
      localizedPath(locale, postLoginPath)
    )
  }

  if (
    pathnameWithoutLocale.startsWith("/super-admin") &&
    postLoginPath !== "/super-admin"
  ) {
    return redirectWithCookies(
      request,
      response,
      localizedPath(locale, "/dashboard")
    )
  }

  if (
    pathnameWithoutLocale.startsWith("/dashboard") &&
    postLoginPath === "/super-admin"
  ) {
    return redirectWithCookies(
      request,
      response,
      localizedPath(locale, "/super-admin")
    )
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Exclude static assets and the push service worker.
     * sw.js must bypass i18n middleware — otherwise next-intl redirects it
     * to /ar/sw.js and the browser receives HTML instead of JavaScript.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
