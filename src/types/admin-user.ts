import { z } from "zod"

export const createCompanyUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "Username may only contain English letters and numbers"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().optional(),
  role: z.enum(["agent", "admin"]),
})

export type CreateCompanyUserInput = z.infer<typeof createCompanyUserSchema>

export const updateUserPasswordSchema = z.object({
  targetUserId: z.string().uuid("Invalid user"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export const updateUserRoleSchema = z.object({
  targetUserId: z.string().uuid("Invalid user"),
  newRole: z.enum(["admin", "agent"]),
})

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
