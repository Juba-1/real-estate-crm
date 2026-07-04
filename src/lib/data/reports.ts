import { createClient } from "@/lib/supabase/server"
import type {
  AgentDetailedReport,
  AgentDetailedReportsData,
  AgentPropertyReportRow,
} from "@/types/reports"
import type { PropertyStatus, PropertyType } from "@/types/property"

type AgentRow = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  agent_id: string
  type: PropertyType
  custom_property_type: string | null
  neighborhood: string
  custom_neighborhood: string | null
  price: number
  status: PropertyStatus
  created_at: string
}

export async function fetchAgentDetailedReports(
  companyId: string
): Promise<AgentDetailedReportsData> {
  const supabase = await createClient()

  const [
    { data: company, error: companyError },
    { data: agents, error: agentsError },
    { data: properties, error: propertiesError },
  ] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).single(),
    supabase
      .from("users")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("role", "agent")
      .order("name", { ascending: true }),
    supabase
      .from("properties")
      .select(
        "id, agent_id, type, custom_property_type, neighborhood, custom_neighborhood, price, status, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ])

  if (companyError) {
    throw new Error(companyError.message)
  }

  if (agentsError) {
    throw new Error(agentsError.message)
  }

  if (propertiesError) {
    throw new Error(propertiesError.message)
  }

  const agentList = (agents ?? []) as AgentRow[]
  const propertyList = (properties ?? []) as PropertyRow[]

  const propertiesByAgent = new Map<string, AgentPropertyReportRow[]>()

  for (const agent of agentList) {
    propertiesByAgent.set(agent.id, [])
  }

  for (const property of propertyList) {
    const row: AgentPropertyReportRow = {
      id: property.id,
      type: property.type,
      custom_property_type: property.custom_property_type,
      neighborhood: property.neighborhood,
      custom_neighborhood: property.custom_neighborhood,
      price: Number(property.price),
      status: property.status,
      created_at: property.created_at,
    }

    const existing = propertiesByAgent.get(property.agent_id) ?? []
    existing.push(row)
    propertiesByAgent.set(property.agent_id, existing)
  }

  const reports: AgentDetailedReport[] = agentList.map((agent) => ({
    agentId: agent.id,
    agentName: agent.name,
    properties: propertiesByAgent.get(agent.id) ?? [],
  }))

  return {
    companyName: company?.name ?? "",
    agents: reports,
  }
}
