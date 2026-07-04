"use server"

import { isRedirectError } from "next/dist/client/components/redirect-error"

import { resolveAuthEmail } from "@/lib/auth/username"
import { isCompanyActiveForUser } from "@/lib/auth/company-access"
import { redirectTo } from "@/i18n/server-redirect"
import { createClient } from "@/lib/supabase/server"

export type LoginState = {
  error: string
} | null

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!identifier || !password) {
    return { error: "Email or username and password are required." }
  }

  try {
    const supabase = await createClient()
    const authEmail = resolveAuthEmail(identifier)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", data.user.id)
      .maybeSingle()

    const isActive = await isCompanyActiveForUser(
      supabase,
      profile ?? { role: null, company_id: null }
    )

    if (!isActive) {
      await supabase.auth.signOut()
      return {
        error:
          "Your company subscription is inactive. Please contact support.",
      }
    }

    if (profile?.role === "super_admin") {
      return redirectTo("/super-admin")
    }

    return redirectTo("/dashboard")
  } catch (error) {
    if (isRedirectError(error)) throw error
    return { error: "An unexpected error occurred. Please try again." }
  }
}
