import { createClient } from "@/lib/supabase/server"
import { normalizePropertyType } from "@/lib/constants/property-types"
import { formatPropertyType, PROPERTY_TYPES } from "@/lib/property-utils"
import type { PropertyStatus, PropertyType } from "@/types/property"

export type StatusDistributionItem = {
  status: PropertyStatus
  count: number
}

export type TenantAgentPerformance = {
  agentId: string
  agentName: string
  totalProperties: number
  soldProperties: number
  rentedProperties: number
}

export type TenantDashboardStats = {
  isAdminView: boolean
  totalProperties: number
  available: number
  sold: number
  rented: number
  pending: number
  activeRequests: number
  statusDistribution: StatusDistributionItem[]
  agentPerformance: TenantAgentPerformance[]
}

export type TypeDistributionItem = {
  type: PropertyType
  label: string
  count: number
}

export type AgentPerformance = {
  agentId: string
  agentName: string
  totalAdded: number
  totalSold: number
  totalRented: number
}

function buildStatusDistribution(
  properties: Pick<PropertyRow, "status">[]
): StatusDistributionItem[] {
  const statuses: PropertyStatus[] = [
    "available",
    "pending",
    "sold",
    "rented",
  ]

  const counts = new Map<PropertyStatus, number>()
  for (const status of statuses) {
    counts.set(status, 0)
  }

  for (const property of properties) {
    counts.set(property.status, (counts.get(property.status) ?? 0) + 1)
  }

  return statuses
    .map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    }))
    .filter((item) => item.count > 0)
}

function buildTenantAgentPerformance(
  properties: PropertyRow[]
): TenantAgentPerformance[] {
  return buildAgentPerformance(properties).map((agent) => ({
    agentId: agent.agentId,
    agentName: agent.agentName,
    totalProperties: agent.totalAdded,
    soldProperties: agent.totalSold,
    rentedProperties: agent.totalRented,
  }))
}

export async function fetchTenantDashboardStats({
  companyId,
  agentId,
  isAdminView,
}: {
  companyId: string
  agentId?: string
  isAdminView: boolean
}): Promise<TenantDashboardStats> {
  const legacy = await getDashboardStats(companyId, agentId)
  const supabase = await createClient()

  let propertiesQuery = supabase
    .from("properties")
    .select("status")
    .eq("company_id", companyId)

  if (agentId) {
    propertiesQuery = propertiesQuery.eq("agent_id", agentId)
  }

  const { data: statusRows, error } = await propertiesQuery

  if (error || !statusRows) {
    return {
      isAdminView,
      totalProperties: legacy.totalProperties,
      available: legacy.available,
      sold: legacy.sold,
      rented: legacy.rented,
      pending: 0,
      activeRequests: legacy.activeRequests,
      statusDistribution: [],
      agentPerformance: isAdminView
        ? legacy.agentPerformance.map((agent) => ({
            agentId: agent.agentId,
            agentName: agent.agentName,
            totalProperties: agent.totalAdded,
            soldProperties: agent.totalSold,
            rentedProperties: agent.totalRented,
          }))
        : [],
    }
  }

  const statusDistribution = buildStatusDistribution(statusRows)
  const pending = statusRows.filter((row) => row.status === "pending").length

  return {
    isAdminView,
    totalProperties: legacy.totalProperties,
    available: legacy.available,
    sold: legacy.sold,
    rented: legacy.rented,
    pending,
    activeRequests: legacy.activeRequests,
    statusDistribution,
    agentPerformance: isAdminView
      ? buildTenantAgentPerformance(
          await fetchAdminPropertyRows(supabase, companyId)
        )
      : [],
  }
}

async function fetchAdminPropertyRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<PropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id,
      type,
      status,
      price,
      agent_id,
      agent:users!properties_agent_id_fkey (name)
    `
    )
    .eq("company_id", companyId)

  if (error || !data) {
    return []
  }

  return data.map((property) => ({
    ...property,
    agent: Array.isArray(property.agent)
      ? (property.agent[0] ?? null)
      : property.agent,
  })) as PropertyRow[]
}

export type DashboardStats = {
  totalProperties: number
  sold: number
  rented: number
  available: number
  activeRequests: number
  closedDealsValue: number
  typeDistribution: TypeDistributionItem[]
  agentPerformance: AgentPerformance[]
}

type PropertyRow = {
  id: string
  type: PropertyType
  status: PropertyStatus
  price: number
  agent_id: string
  agent?: { name: string } | { name: string }[] | null
}

function normalizeAgentName(
  agent: PropertyRow["agent"],
  agentId: string
): string {
  if (Array.isArray(agent)) {
    return agent[0]?.name ?? "Unknown agent"
  }

  return agent?.name ?? `Agent ${agentId.slice(0, 8)}`
}

function buildTypeDistribution(
  properties: Pick<PropertyRow, "type">[]
): TypeDistributionItem[] {
  const counts = new Map<PropertyType, number>()

  for (const type of PROPERTY_TYPES) {
    counts.set(type, 0)
  }

  for (const property of properties) {
    const normalizedType = normalizePropertyType(property.type) as PropertyType
    counts.set(normalizedType, (counts.get(normalizedType) ?? 0) + 1)
  }

  return PROPERTY_TYPES.map((type) => ({
    type,
    label: formatPropertyType(type),
    count: counts.get(type) ?? 0,
  })).filter((item) => item.count > 0)
}

function buildAgentPerformance(properties: PropertyRow[]): AgentPerformance[] {
  const byAgent = new Map<
    string,
    { agentName: string; totalAdded: number; totalSold: number; totalRented: number }
  >()

  for (const property of properties) {
    const agentName = normalizeAgentName(property.agent, property.agent_id)
    const existing = byAgent.get(property.agent_id) ?? {
      agentName,
      totalAdded: 0,
      totalSold: 0,
      totalRented: 0,
    }

    existing.totalAdded += 1
    if (property.status === "sold") {
      existing.totalSold += 1
    }
    if (property.status === "rented") {
      existing.totalRented += 1
    }

    byAgent.set(property.agent_id, existing)
  }

  return [...byAgent.entries()]
    .map(([agentId, stats]) => ({
      agentId,
      ...stats,
    }))
    .sort((a, b) => {
    const closedA = a.totalSold + a.totalRented
    const closedB = b.totalSold + b.totalRented
    if (closedB !== closedA) {
      return closedB - closedA
    }

    return b.totalAdded - a.totalAdded
  })
}

function emptyStats(): DashboardStats {
  return {
    totalProperties: 0,
    sold: 0,
    rented: 0,
    available: 0,
    activeRequests: 0,
    closedDealsValue: 0,
    typeDistribution: [],
    agentPerformance: [],
  }
}

export async function getDashboardStats(
  companyId: string,
  agentId?: string
): Promise<DashboardStats> {
  const supabase = await createClient()
  const isAdminView = !agentId

  let requestsQuery = supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active")
    .gte("expires_at", new Date().toISOString())

  if (agentId) {
    requestsQuery = requestsQuery.eq("agent_id", agentId)
  }

  const requestsResult = await requestsQuery

  if (isAdminView) {
    const { data, error } = await supabase
      .from("properties")
      .select(
        `
        id,
        type,
        status,
        price,
        agent_id,
        agent:users!properties_agent_id_fkey (name)
      `
      )
      .eq("company_id", companyId)

    if (error || !data) {
      return emptyStats()
    }

    const properties = data.map((property) => ({
      ...property,
      agent: Array.isArray(property.agent)
        ? (property.agent[0] ?? null)
        : property.agent,
    })) as PropertyRow[]

    return buildStatsFromProperties(properties, requestsResult.count ?? 0)
  }

  const { data, error } = await supabase
    .from("properties")
    .select("id, type, status, price, agent_id")
    .eq("company_id", companyId)
    .eq("agent_id", agentId)

  if (error || !data) {
    return emptyStats()
  }

  return buildStatsFromProperties(data as PropertyRow[], requestsResult.count ?? 0)
}

function buildStatsFromProperties(
  properties: PropertyRow[],
  activeRequests: number
): DashboardStats {
  const sold = properties.filter((p) => p.status === "sold")
  const rented = properties.filter((p) => p.status === "rented")
  const closedDealsValue = [...sold, ...rented].reduce(
    (sum, property) => sum + Number(property.price),
    0
  )

  return {
    totalProperties: properties.length,
    sold: sold.length,
    rented: rented.length,
    available: properties.filter((p) => p.status === "available").length,
    activeRequests,
    closedDealsValue,
    typeDistribution: buildTypeDistribution(properties),
    agentPerformance: properties.some((p) => p.agent !== undefined)
      ? buildAgentPerformance(properties)
      : [],
  }
}
