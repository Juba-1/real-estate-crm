import { z } from "zod"

const quotaSchema = z.coerce
  .number()
  .int("Quota must be a whole number.")
  .min(1, "Quota must be at least 1.")
  .max(100000, "Quota is too large.")

export const packageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Package name must be at least 2 characters.")
    .max(120, "Package name is too long."),
  maxProperties: quotaSchema,
  maxAgents: quotaSchema,
})

export const createPackageSchema = packageSchema

export const updatePackageSchema = packageSchema.extend({
  packageId: z.string().uuid("Invalid package."),
})

export type CreatePackageInput = z.infer<typeof createPackageSchema>
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>

export type PackageRow = {
  id: string
  name: string
  max_properties: number
  max_agents: number
  created_at: string
}
