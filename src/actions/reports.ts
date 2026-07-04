"use server"

import { getCurrentUser } from "@/lib/data/user"
import { fetchAgentDetailedReports } from "@/lib/data/reports"
import type { AgentDetailedReportsData } from "@/types/reports"

export type AgentDetailedReportsResult =
  | { error: string }
  | { data: AgentDetailedReportsData }

export async function getAgentDetailedReports(): Promise<AgentDetailedReportsResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { error: "You must be signed in to view reports." }
  }

  if (user.role !== "admin") {
    return { error: "Only company admins can access reports." }
  }

  if (!user.company_id) {
    return { error: "Your account is not linked to a company yet." }
  }

  try {
    const data = await fetchAgentDetailedReports(user.company_id)
    return { data }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to load agent reports.",
    }
  }
}
