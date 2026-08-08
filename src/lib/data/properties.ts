import { createClient } from "@/lib/supabase/server"
import { assertCanEditProperty } from "@/lib/authz/tenant"
import {
  normalizePropertyType,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import { parsePage, type PaginatedResult } from "@/lib/pagination"
import { compareByUrgency } from "@/lib/urgent"
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
  page?: string | string[]
  pageSize?: string | string[]
}

export type MyProperty = {
  id: string
  type: PropertyType
  custom_property_type: string | null
  offer_type: OfferType
  city: string
  neighborhood: string
  price: number
  area: number
  specs: Record<string, unknown> | null
  images: string[]
  status: PropertyStatus
  created_at: string
  google_maps_url: string | null
  urgent_until: string | null
  property_owners: PropertyOwnerRecord[]
}

export type EditableProperty = MyProperty & {
  custom_neighborhood: string | null
  floors_count: number | null
  apartments_count: number | null
  shops_count: number | null
  has_annex: boolean | null
  is_direct: boolean
  intermediaries: string | null
  plot_letter: string | null
  general_notes: string | null
}

export type CompanyProperty = {
  id: string
  type: PropertyType
  custom_property_type: string | null
  offer_type: OfferType
  city: string
  neighborhood: string
  price: number
  area: number
  specs: Record<string, unknown> | null
  images: string[]
  status: PropertyStatus
  created_at: string
  google_maps_url: string | null
  urgent_until: string | null
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

  const isBuiltInType =
    !!typeParam &&
    (PROPERTY_TYPE_VALUES as readonly string[]).includes(typeParam) &&
    typeParam !== "other"

  const type = propertyTypeSchema.safeParse(
    isBuiltInType && typeParam ? normalizePropertyType(typeParam) : undefined
  )
  const offer_type = offerTypeSchema.safeParse(offerTypeParam)
  const status = statusParam
    ? propertyStatusSchema.safeParse(statusParam)
    : { success: true as const, data: "available" as PropertyStatus }

  return {
    city: city || undefined,
    type: type.success ? type.data : undefined,
    // Approved dictionary labels are stored as type=other + custom_property_type.
    customPropertyType:
      typeParam && !isBuiltInType ? typeParam : undefined,
    offer_type: offer_type.success ? offer_type.data : undefined,
    status: status.success ? status.data : ("available" as PropertyStatus),
  }
}

export async function getCompanyProperties(
  searchParams: CompanyPropertySearchParams = {}
): Promise<PaginatedResult<CompanyProperty>> {
  const empty: PaginatedResult<CompanyProperty> = {
    items: [],
    page: 1,
    pageSize: 24,
    total: 0,
    hasMore: false,
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return empty
  }

  const filters = parseCompanySearchFilters(searchParams)
  const { page, pageSize, from, to } = parsePage(searchParams)

  let query = supabase
    .from("properties")
    .select(
      `
      id,
      type,
      custom_property_type,
      offer_type,
      city,
      neighborhood,
      price,
      area,
      specs,
      images,
      status,
      created_at,
      google_maps_url,
      urgent_until,
      agent:users!properties_agent_id_fkey (
        name,
        phone
      )
    `,
      { count: "exact" }
    )
    .eq("status", filters.status)
    .order("urgent_until", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.city) {
    query = query.eq("city", filters.city)
  }

  if (filters.type) {
    query = query.eq("type", filters.type)
  } else if (filters.customPropertyType) {
    query = query
      .eq("type", "other")
      .eq("custom_property_type", filters.customPropertyType)
  }

  if (filters.offer_type) {
    query = query.eq("offer_type", filters.offer_type)
  }

  const { data, error, count } = await query

  if (error || !data) {
    return { ...empty, page, pageSize }
  }

  const items = data.map((property) => ({
    ...property,
    agent: Array.isArray(property.agent)
      ? (property.agent[0] ?? null)
      : property.agent,
  })) as CompanyProperty[]

  const total = count ?? items.length
  return {
    items: items.sort(compareByUrgency),
    page,
    pageSize,
    total,
    hasMore: from + items.length < total,
  }
}

export async function getMyProperties(
  pageParams: { page?: string | string[]; pageSize?: string | string[] } = {}
): Promise<PaginatedResult<MyProperty>> {
  const empty: PaginatedResult<MyProperty> = {
    items: [],
    page: 1,
    pageSize: 24,
    total: 0,
    hasMore: false,
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return empty
  }

  const { page, pageSize, from, to } = parsePage(pageParams)

  const { data, error, count } = await supabase
    .from("properties")
    .select(
      `
      id,
      type,
      custom_property_type,
      offer_type,
      city,
      neighborhood,
      price,
      area,
      specs,
      images,
      status,
      created_at,
      google_maps_url,
      urgent_until,
      property_owners (
        owner_name,
        owner_phone,
        private_notes
      )
    `,
      { count: "exact" }
    )
    .eq("agent_id", user.id)
    .order("urgent_until", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error || !data) {
    return { ...empty, page, pageSize }
  }

  const items = (data as MyProperty[]).sort(compareByUrgency)
  const total = count ?? items.length
  return {
    items,
    page,
    pageSize,
    total,
    hasMore: from + items.length < total,
  }
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
  intermediaries,
  google_maps_url,
  plot_letter,
  general_notes,
  created_at,
  urgent_until,
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

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id || !profile.role) {
    return null
  }

  const access = await assertCanEditProperty(
    supabase,
    user.id,
    profile,
    propertyId
  )
  if ("error" in access) {
    return null
  }

  const { data, error } = await supabase
    .from("properties")
    .select(EDITABLE_PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as EditableProperty
}
