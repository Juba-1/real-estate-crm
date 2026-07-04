"use server"

import { getCurrentUser } from "@/lib/data/user"
import {
  fetchTenantDashboardStats,
  type TenantDashboardStats,
} from "@/lib/data/analytics"

export type TenantDashboardStatsResult =
  | { error: string }
  | { stats: TenantDashboardStats }

export async function getTenantDashboardStats(): Promise<TenantDashboardStatsResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { error: "You must be signed in to view dashboard analytics." }
  }

  if (!user.company_id) {
    return { error: "Your account is not linked to a company yet." }
  }

  if (user.role !== "admin" && user.role !== "agent") {
    return { error: "Your role cannot access the tenant dashboard." }
  }

  const stats = await fetchTenantDashboardStats({
    companyId: user.company_id,
    agentId: user.role === "admin" ? undefined : user.id,
    isAdminView: user.role === "admin",
  })

  return { stats }
}
