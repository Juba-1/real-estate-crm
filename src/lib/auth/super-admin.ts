import { redirectTo } from "@/i18n/server-redirect"
import { getCurrentUser } from "@/lib/data/user"
import type { CurrentUserProfile } from "@/types/user"

export async function requireSuperAdmin(): Promise<
  | { user: CurrentUserProfile & { role: "super_admin" } }
  | { error: string }
> {
  const user = await getCurrentUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  if (user.role !== "super_admin") {
    return { error: "Forbidden." }
  }

  return { user: user as CurrentUserProfile & { role: "super_admin" } }
}

export async function ensureSuperAdminPage(): Promise<
  CurrentUserProfile & { role: "super_admin" }
> {
  const user = await getCurrentUser()

  if (!user) {
    await redirectTo("/login")
    throw new Error("Unreachable")
  }

  if (user.role !== "super_admin") {
    await redirectTo("/dashboard")
    throw new Error("Unreachable")
  }

  return user as CurrentUserProfile & { role: "super_admin" }
}
