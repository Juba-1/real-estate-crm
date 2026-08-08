/**
 * Request-level memoization for company branding (sidebar/header).
 */
import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type CompanyBranding = {
  id: string
  name: string
  logo_url: string | null
}

async function loadCompanyBranding(
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

export const getCompanyBranding = cache(loadCompanyBranding)
