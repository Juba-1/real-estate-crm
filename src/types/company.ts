import { z } from "zod"

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Username may only contain English letters and numbers."
  )

const quotaSchema = z.coerce
  .number()
  .int("Quota must be a whole number.")
  .min(1, "Quota must be at least 1.")
  .max(100000, "Quota is too large.")

export const onboardNewTenantSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters.")
    .max(120, "Company name is too long."),
  packageId: z.string().uuid("Please select a subscription package."),
  maxProperties: quotaSchema,
  maxAgents: quotaSchema,
  adminName: z.string().trim().min(1, "Admin name is required."),
  adminUsername: usernameSchema,
  adminPassword: z.string().min(6, "Password must be at least 6 characters."),
  adminPhone: z.string().trim().optional(),
})

export type OnboardNewTenantInput = z.infer<typeof onboardNewTenantSchema>

export type CompanyRow = {
  id: string
  name: string
  is_active: boolean
  package_id: string | null
  max_properties: number
  max_agents: number
  logo_url: string | null
  created_at: string
}

export const updateCompanySchema = z.object({
  companyId: z.string().uuid("Invalid company."),
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters.")
    .max(120, "Company name is too long."),
  packageId: z.string().uuid("Please select a subscription package."),
  maxProperties: quotaSchema,
  maxAgents: quotaSchema,
})

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const resetTenantAdminPasswordSchema = z.object({
  companyId: z.string().uuid("Invalid company."),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
})

export type ResetTenantAdminPasswordInput = z.infer<
  typeof resetTenantAdminPasswordSchema
>
