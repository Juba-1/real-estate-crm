import { z } from "zod"

export const removalReasonKeySchema = z.enum([
  "mistake",
  "duplicate",
  "owner_withdrew",
  "wrong_info",
  "other",
])

export type RemovalReasonKey = z.infer<typeof removalReasonKeySchema>

export const removalRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "archived_instead",
])

export type RemovalRequestStatus = z.infer<typeof removalRequestStatusSchema>

export const requestPropertyRemovalSchema = z
  .object({
    propertyId: z.string().uuid(),
    reasonKey: removalReasonKeySchema,
    reasonDetail: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reasonKey === "other" && !value.reasonDetail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please describe the reason.",
        path: ["reasonDetail"],
      })
    }
  })

export type RequestPropertyRemovalInput = z.infer<
  typeof requestPropertyRemovalSchema
>

export const decidePropertyRemovalSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "archive"]),
  decisionNote: z.string().trim().max(500).optional(),
})

export type DecidePropertyRemovalInput = z.infer<
  typeof decidePropertyRemovalSchema
>
