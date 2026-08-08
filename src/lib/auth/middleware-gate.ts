import type { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export type MiddlewareGateProfile = {
  role: string | null
  company_id: string | null
  company_is_active: boolean | null
}

function createMiddlewareSupabase(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createServerClient(supabaseUrl, supabaseKey, {
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
}

/**
 * Single users profile fetch (+ optional company is_active).
 * Replaces previous middleware pattern of users → companies → users.role.
 */
export async function loadMiddlewareGateProfile(
  request: NextRequest,
  response: NextResponse,
  userId: string
): Promise<{
  supabase: SupabaseClient
  profile: MiddlewareGateProfile | null
} | null> {
  const supabase = createMiddlewareSupabase(request, response)
  if (!supabase) {
    return null
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) {
    return { supabase, profile: null }
  }

  let company_is_active: boolean | null = null

  if (profile.role !== "super_admin" && profile.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("is_active")
      .eq("id", profile.company_id)
      .maybeSingle()

    company_is_active = company?.is_active ?? null
  }

  return {
    supabase,
    profile: {
      role: profile.role,
      company_id: profile.company_id,
      company_is_active,
    },
  }
}

export function isGateCompanyActive(profile: MiddlewareGateProfile): boolean {
  if (profile.role === "super_admin") {
    return true
  }

  if (!profile.company_id) {
    return true
  }

  // Fail closed: unknown active state must not admit inactive tenants.
  if (profile.company_is_active === null) {
    return false
  }

  return profile.company_is_active
}

export function postLoginPathForRole(role: string | null | undefined): string {
  return role === "super_admin" ? "/super-admin" : "/dashboard"
}
