import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/user"

export type TeamMember = {
  id: string
  name: string
  phone: string | null
  role: UserRole
  created_at: string
}

const roleOrder: Record<UserRole, number> = {
  super_admin: 0,
  admin: 1,
  agent: 2,
}

export async function getCompanyTeam(): Promise<TeamMember[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return []
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, role, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true })

  if (error || !data) {
    return []
  }

  const team = data as TeamMember[]

  return [...team].sort((a, b) => {
    const roleDiff = roleOrder[a.role] - roleOrder[b.role]
    if (roleDiff !== 0) {
      return roleDiff
    }

    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })
}
