export type UserRole = "super_admin" | "admin" | "agent"

export type CurrentUserProfile = {
  id: string
  name: string
  role: UserRole | null
  company_id: string | null
  hasProfile: boolean
}
