import createIntlMiddleware from "next-intl/middleware"
import { type NextRequest, NextResponse } from "next/server"

import { routing } from "@/i18n/routing"
import { isCompanyActiveForUser } from "@/lib/auth/company-access"
import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"

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

async function getPostLoginPath(
  request: NextRequest,
  response: NextResponse,
  userId: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return "/dashboard"
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  return profile?.role === "super_admin" ? "/super-admin" : "/dashboard"
}

async function enforceActiveCompanyAccess(
  request: NextRequest,
  response: NextResponse,
  userId: string,
  locale: string
): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) {
    return null
  }

  const isActive = await isCompanyActiveForUser(supabase, profile)

  if (isActive) {
    return null
  }

  await supabase.auth.signOut()

  const url = request.nextUrl.clone()
  url.pathname = localizedPath(locale, "/login")
  url.searchParams.set("error", "inactive_company")

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
    const url = request.nextUrl.clone()
    url.pathname = localizedPath(locale, "/login")
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (user && isLoginRoute) {
    const inactiveRedirect = await enforceActiveCompanyAccess(
      request,
      response,
      user.id,
      locale
    )

    if (inactiveRedirect) {
      return inactiveRedirect
    }

    const postLoginPath = await getPostLoginPath(request, response, user.id)
    const url = request.nextUrl.clone()
    url.pathname = localizedPath(locale, postLoginPath)
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (user && pathnameWithoutLocale.startsWith("/super-admin")) {
    const postLoginPath = await getPostLoginPath(request, response, user.id)
    if (postLoginPath !== "/super-admin") {
      const url = request.nextUrl.clone()
      url.pathname = localizedPath(locale, "/dashboard")
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
      })
      return redirectResponse
    }
  }

  if (user && pathnameWithoutLocale.startsWith("/dashboard")) {
    const inactiveRedirect = await enforceActiveCompanyAccess(
      request,
      response,
      user.id,
      locale
    )

    if (inactiveRedirect) {
      return inactiveRedirect
    }

    const postLoginPath = await getPostLoginPath(request, response, user.id)
    if (postLoginPath === "/super-admin") {
      const url = request.nextUrl.clone()
      url.pathname = localizedPath(locale, "/super-admin")
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
      })
      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
