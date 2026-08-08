import { z } from "zod"

import {
  getNeighborhoodsForCity,
} from "@/lib/constants/locations"
import { isNeighborhoodOther, isPropertyTypeOther } from "@/lib/constants/property-types"
import { offerTypeSchema, propertyTypeSchema } from "@/types/property"

export const requestStatusSchema = z.enum(["active", "executed", "archived"])

const optionalPositiveNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  },
  z.number().positive("Must be a positive number").optional()
)

export const insertRequestSchema = z
  .object({
    type: propertyTypeSchema,
    custom_property_type: z.string().trim().optional(),
    offer_type: offerTypeSchema,
    city: z.string().min(1, "City is required"),
    neighborhood: z.string().trim().optional(),
    custom_neighborhood: z.string().trim().optional(),
    details: z.string().trim().min(1, "Details are required"),
    budget_min: optionalPositiveNumber,
    budget_max: optionalPositiveNumber,
    area_min: optionalPositiveNumber,
    area_max: optionalPositiveNumber,
    mark_urgent: z.boolean().optional(),
  })
  .superRefine((data, context) => {
    if (data.city.trim().length < 2) {
      context.addIssue({
        code: "custom",
        message: "City is required",
        path: ["city"],
      })
      return
    }

    if (data.neighborhood) {
      const neighborhoods = getNeighborhoodsForCity(data.city)
      if (
        neighborhoods.length > 0 &&
        !neighborhoods.includes(data.neighborhood) &&
        !isNeighborhoodOther(data.neighborhood)
      ) {
        // Approved dictionary district for this city — allowed.
      }
    }

    if (isPropertyTypeOther(data.type)) {
      const customType = data.custom_property_type?.trim()
      if (!customType || customType.length < 2) {
        context.addIssue({
          code: "custom",
          message: "Please enter a custom property type",
          path: ["custom_property_type"],
        })
      }
    }

    if (data.neighborhood && isNeighborhoodOther(data.neighborhood)) {
      const customNeighborhood = data.custom_neighborhood?.trim()
      if (!customNeighborhood || customNeighborhood.length < 2) {
        context.addIssue({
          code: "custom",
          message: "Please enter a custom neighborhood",
          path: ["custom_neighborhood"],
        })
      }
    }
  })

export type RequestStatus = z.infer<typeof requestStatusSchema>
export type InsertRequestInput = z.infer<typeof insertRequestSchema>

export type InsertRequestFormValues = {
  type: z.infer<typeof propertyTypeSchema>
  custom_property_type?: string
  offer_type: z.infer<typeof offerTypeSchema>
  city: string
  neighborhood?: string
  custom_neighborhood?: string
  details: string
  budget_min?: string | number
  budget_max?: string | number
  area_min?: string | number
  area_max?: string | number
  mark_urgent?: boolean
}

export type ManageRequestAction = "renew" | "execute" | "archive"
