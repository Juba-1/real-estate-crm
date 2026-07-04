import { createClient } from "@/lib/supabase/server"
import { normalizePropertyType } from "@/lib/constants/property-types"
import {
  offerTypeSchema,
  propertyStatusSchema,
  propertyTypeSchema,
  type OfferType,
  type PropertyStatus,
  type PropertyType,
} from "@/types/property"

export type PropertyOwnerRecord = {
  owner_name: string
  owner_phone: string
  private_notes: string | null
}

export type ListingAgent = {
  name: string
  phone: string | null
}

export type CompanyPropertySearchParams = {
  city?: string | string[]
  type?: string | string[]
  offer_type?: string | string[]
  status?: string | string[]
}

export type MyProperty = {
  id: string
  type: PropertyType
  offer_type: OfferType
  city: string
  neighborhood: string
  price: number
  area: number
  specs: Record<string, unknown> | null
  images: string[]
  status: PropertyStatus
  created_at: string
  property_owners: PropertyOwnerRecord[]
}

export type EditableProperty = MyProperty & {
  custom_property_type: string | null
  custom_neighborhood: string | null
  floors_count: number | null
  apartments_count: number | null
  shops_count: number | null
  has_annex: boolean | null
  is_direct: boolean
  general_notes: string | null
}

export type CompanyProperty = {
  id: string
  type: PropertyType
  offer_type: OfferType
  city: string
  neighborhood: string
  price: number
  area: number
  specs: Record<string, unknown> | null
  images: string[]
  status: PropertyStatus
  created_at: string
  agent: ListingAgent | null
}

function getSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parseCompanySearchFilters(searchParams: CompanyPropertySearchParams) {
  const city = getSearchParam(searchParams.city)
  const typeParam = getSearchParam(searchParams.type)
  const offerTypeParam = getSearchParam(searchParams.offer_type)
  const statusParam = getSearchParam(searchParams.status)

  const type = propertyTypeSchema.safeParse(
    typeParam ? normalizePropertyType(typeParam) : undefined
  )
  const offer_type = offerTypeSchema.safeParse(offerTypeParam)
  const status = statusParam
    ? propertyStatusSchema.safeParse(statusParam)
    : { success: true as const, data: "available" as PropertyStatus }

  return {
    city: city || undefined,
    type: type.success ? type.data : undefined,
    offer_type: offer_type.success ? offer_type.data : undefined,
    status: status.success ? status.data : ("available" as PropertyStatus),
  }
}

export async function getCompanyProperties(
  searchParams: CompanyPropertySearchParams = {}
): Promise<CompanyProperty[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const filters = parseCompanySearchFilters(searchParams)

  let query = supabase
    .from("properties")
    .select(
      `
      id,
      type,
      offer_type,
      city,
      neighborhood,
      price,
      area,
      specs,
      images,
      status,
      created_at,
      agent:users!properties_agent_id_fkey (
        name,
        phone
      )
    `
    )
    .eq("status", filters.status)
    .order("created_at", { ascending: false })

  if (filters.city) {
    query = query.eq("city", filters.city)
  }

  if (filters.type) {
    query = query.eq("type", filters.type)
  }

  if (filters.offer_type) {
    query = query.eq("offer_type", filters.offer_type)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return data.map((property) => ({
    ...property,
    agent: Array.isArray(property.agent)
      ? (property.agent[0] ?? null)
      : property.agent,
  })) as CompanyProperty[]
}

export async function getMyProperties(): Promise<MyProperty[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return []
  }

  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      type,
      offer_type,
      city,
      neighborhood,
      price,
      area,
      specs,
      images,
      status,
      created_at,
      property_owners (
        owner_name,
        owner_phone,
        private_notes
      )
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data as MyProperty[]
}

const EDITABLE_PROPERTY_SELECT = `
  id,
  type,
  custom_property_type,
  offer_type,
  city,
  neighborhood,
  custom_neighborhood,
  price,
  area,
  specs,
  images,
  status,
  floors_count,
  apartments_count,
  shops_count,
  has_annex,
  is_direct,
  general_notes,
  created_at,
  property_owners (
    owner_name,
    owner_phone,
    private_notes
  )
`

export async function getPropertyForEdit(
  propertyId: string
): Promise<EditableProperty | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data, error } = await supabase
    .from("properties")
    .select(EDITABLE_PROPERTY_SELECT)
    .eq("id", propertyId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as EditableProperty
}
