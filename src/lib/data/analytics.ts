import { createClient } from "@/lib/supabase/server"
import { normalizePropertyType } from "@/lib/constants/property-types"
import {
  countPendingRemovalsForAgent,
  countPendingRemovalsForCompany,
} from "@/lib/data/property-removals"
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
  archived: number
  pendingRemovals: number
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

type RpcDashboardPayload = {
  totalProperties?: number
  available?: number
  sold?: number
  rented?: number
  pending?: number
  activeRequests?: number
  closedDealsValue?: number
  statusDistribution?: Array<{ status: string; count: number }>
  typeDistribution?: Array<{ type: string; count: number }>
  agentPerformance?: Array<{
    agent_id: string
    agent_name: string
    total_added: number
    total_sold: number
    total_rented: number
  }>
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

function mapTypeDistribution(
  rows: Array<{ type: string; count: number }> | undefined
): TypeDistributionItem[] {
  if (!rows?.length) return []

  const counts = new Map<PropertyType, number>()
  for (const type of PROPERTY_TYPES) {
    counts.set(type, 0)
  }

  for (const row of rows) {
    const normalized = normalizePropertyType(row.type) as PropertyType
    counts.set(normalized, (counts.get(normalized) ?? 0) + Number(row.count))
  }

  return PROPERTY_TYPES.map((type) => ({
    type,
    label: formatPropertyType(type),
    count: counts.get(type) ?? 0,
  })).filter((item) => item.count > 0)
}

async function loadDashboardViaRpc(
  companyId: string,
  agentId?: string
): Promise<DashboardStats | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_tenant_dashboard_stats", {
    p_company_id: companyId,
    p_agent_id: agentId ?? null,
  })

  if (error || !data) {
    console.error("[analytics] dashboard RPC failed", error?.message)
    return null
  }

  const payload = data as RpcDashboardPayload

  return {
    totalProperties: Number(payload.totalProperties ?? 0),
    available: Number(payload.available ?? 0),
    sold: Number(payload.sold ?? 0),
    rented: Number(payload.rented ?? 0),
    activeRequests: Number(payload.activeRequests ?? 0),
    closedDealsValue: Number(payload.closedDealsValue ?? 0),
    typeDistribution: mapTypeDistribution(payload.typeDistribution),
    agentPerformance: (payload.agentPerformance ?? []).map((agent) => ({
      agentId: agent.agent_id,
      agentName: agent.agent_name,
      totalAdded: Number(agent.total_added),
      totalSold: Number(agent.total_sold),
      totalRented: Number(agent.total_rented),
    })),
  }
}

/**
 * Tenant dashboard stats via SQL aggregates (no full-table download).
 * Falls back to empty if RPC unavailable (migration not applied yet).
 */
export async function getDashboardStats(
  companyId: string,
  agentId?: string
): Promise<DashboardStats> {
  const viaRpc = await loadDashboardViaRpc(companyId, agentId)
  return viaRpc ?? emptyStats()
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
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_tenant_dashboard_stats", {
    p_company_id: companyId,
    p_agent_id: agentId ?? null,
  })

  if (error || !data) {
    console.error("[analytics] tenant dashboard RPC failed", error?.message)
    return {
      isAdminView,
      totalProperties: 0,
      available: 0,
      sold: 0,
      rented: 0,
      pending: 0,
      archived: 0,
      pendingRemovals: 0,
      activeRequests: 0,
      statusDistribution: [],
      agentPerformance: [],
    }
  }

  const payload = data as RpcDashboardPayload
  const statusDistribution: StatusDistributionItem[] = (
    payload.statusDistribution ?? []
  )
    .map((row) => ({
      status: row.status as PropertyStatus,
      count: Number(row.count),
    }))
    .filter((item) => item.count > 0)

  const archived =
    statusDistribution.find((item) => item.status === "archived")?.count ?? 0

  const pendingRemovals = isAdminView
    ? await countPendingRemovalsForCompany(companyId)
    : agentId
      ? await countPendingRemovalsForAgent(companyId, agentId)
      : 0

  return {
    isAdminView,
    totalProperties: Number(payload.totalProperties ?? 0),
    available: Number(payload.available ?? 0),
    sold: Number(payload.sold ?? 0),
    rented: Number(payload.rented ?? 0),
    pending: Number(payload.pending ?? 0),
    archived,
    pendingRemovals,
    activeRequests: Number(payload.activeRequests ?? 0),
    statusDistribution,
    agentPerformance: isAdminView
      ? (payload.agentPerformance ?? []).map((agent) => ({
          agentId: agent.agent_id,
          agentName: agent.agent_name,
          totalProperties: Number(agent.total_added),
          soldProperties: Number(agent.total_sold),
          rentedProperties: Number(agent.total_rented),
        }))
      : [],
  }
}
