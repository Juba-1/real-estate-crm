/**
 * Request-level memoization for hot auth/profile reads.
 * Dedupes middleware→layout→page→action waterfalls within one RSC render.
 */
import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { CurrentUserProfile } from "@/types/user"

async function loadCurrentUser(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("name, role, company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return {
      id: user.id,
      name: user.email?.split("@")[0] ?? "User",
      role: null,
      company_id: null,
      hasProfile: false,
    }
  }

  return {
    id: user.id,
    name: profile.name,
    role: profile.role,
    company_id: profile.company_id,
    hasProfile: true,
  }
}

export const getCurrentUser = cache(loadCurrentUser)
