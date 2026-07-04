import { createClient } from "@/lib/supabase/server"

export type CompanyBranding = {
  id: string
  name: string
  logo_url: string | null
}

export async function getCompanyBranding(
  companyId: string
): Promise<CompanyBranding | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, logo_url")
    .eq("id", companyId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
