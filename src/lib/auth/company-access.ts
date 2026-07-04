import type { SupabaseClient } from "@supabase/supabase-js"

export type CompanyAccessProfile = {
  role: string | null
  company_id: string | null
}

export async function isCompanyActiveForUser(
  supabase: SupabaseClient,
  profile: CompanyAccessProfile
): Promise<boolean> {
  if (profile.role === "super_admin") {
    return true
  }

  if (!profile.company_id) {
    return true
  }

  const { data: company, error } = await supabase
    .from("companies")
    .select("is_active")
    .eq("id", profile.company_id)
    .maybeSingle()

  if (error || !company) {
    return true
  }

  return company.is_active
}
