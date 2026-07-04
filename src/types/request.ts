import { z } from "zod"

import {
  EASTERN_CITY_NAMES,
  getNeighborhoodsForCity,
} from "@/lib/constants/locations"
import { isNeighborhoodOther, isPropertyTypeOther } from "@/lib/constants/property-types"
import { offerTypeSchema, propertyTypeSchema } from "@/types/property"

export const requestStatusSchema = z.enum(["active", "executed", "archived"])

export const insertRequestSchema = z
  .object({
    type: propertyTypeSchema,
    custom_property_type: z.string().trim().optional(),
    offer_type: offerTypeSchema,
    city: z.string().min(1, "City is required"),
    neighborhood: z.string().trim().optional(),
    custom_neighborhood: z.string().trim().optional(),
    details: z.string().trim().min(1, "Details are required"),
  })
  .superRefine((data, context) => {
    if (!EASTERN_CITY_NAMES.includes(data.city)) {
      context.addIssue({
        code: "custom",
        message: "Please select a valid Eastern Province city",
        path: ["city"],
      })
      return
    }

    if (data.neighborhood) {
      const neighborhoods = getNeighborhoodsForCity(data.city)
      if (!neighborhoods.includes(data.neighborhood)) {
        context.addIssue({
          code: "custom",
          message: "Please select a valid neighborhood for the chosen city",
          path: ["neighborhood"],
        })
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
}

export type ManageRequestAction = "renew" | "execute" | "archive"
