"use server"

import { isRedirectError } from "next/dist/client/components/redirect-error"

import { redirectTo } from "@/i18n/server-redirect"
import { createClient } from "@/lib/supabase/server"

export async function logout() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    return redirectTo("/login")
  } catch (error) {
    if (isRedirectError(error)) throw error
    throw error
  }
}
