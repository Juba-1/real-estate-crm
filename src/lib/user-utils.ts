import type { UserRole } from "@/types/user"

export function formatUserRole(role: UserRole | null): string {
  if (!role) {
    return "Pending setup"
  }

  switch (role) {
    case "super_admin":
      return "Super Admin"
    case "admin":
      return "Admin"
    case "agent":
      return "Agent"
    default:
      return role
  }
}

export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
