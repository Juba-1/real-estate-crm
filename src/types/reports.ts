import type { OfferType, PropertyStatus, PropertyType } from "@/types/property"

export type AgentPropertyReportRow = {
  id: string
  type: PropertyType
  custom_property_type: string | null
  neighborhood: string
  custom_neighborhood: string | null
  price: number
  status: PropertyStatus
  created_at: string
}

export type AgentDetailedReport = {
  agentId: string
  agentName: string
  properties: AgentPropertyReportRow[]
}

export type AgentDetailedReportsData = {
  companyName: string
  agents: AgentDetailedReport[]
}

export type AgentReportTableRow = {
  agentId: string
  agentName: string
  propertyId: string
  type: PropertyType
  custom_property_type: string | null
  neighborhood: string
  custom_neighborhood: string | null
  price: number
  status: PropertyStatus
  created_at: string
}
