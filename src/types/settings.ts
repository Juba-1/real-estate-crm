import { z } from "zod"

export const systemSettingsSchema = z.object({
  platformName: z
    .string()
    .trim()
    .min(2, "Platform name must be at least 2 characters.")
    .max(120, "Platform name is too long."),
  supportEmail: z.string().trim().email("Invalid support email."),
  defaultCurrency: z.string().trim().min(1),
  maintenanceMode: z.boolean(),
})

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>
