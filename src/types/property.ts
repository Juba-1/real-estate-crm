import { z } from "zod"

import {
  getNeighborhoodsForCity,
} from "@/lib/constants/locations"
import {
  isBuildingType,
  isLandType,
  isNeighborhoodOther,
  isPropertyTypeOther,
  OTHER_OPTION,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"

export const propertyTypeSchema = z.enum(PROPERTY_TYPE_VALUES)

export const offerTypeSchema = z.enum(["sale", "rent"])

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

const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined
  }

  return value
}, z.boolean().optional())

export const propertySpecsSchema = z.object({
  rooms: optionalPositiveNumber,
  age: optionalPositiveNumber,
  street_width: optionalPositiveNumber,
  plan_number: z.string().trim().optional(),
  plot_number: z.string().trim().optional(),
  floor: optionalPositiveNumber,
  project_name: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

const optionalGoogleMapsUrl = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value.trim()
  }

  return value
}, z.string().url("Must be a valid URL").nullable())

const optionalPlotLetter = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null
  }

  if (typeof value === "string") {
    return value.trim()
  }

  return value
}, z.string().max(20, "Plot letter must be 20 characters or fewer").nullable())

const requiredPositiveNumber = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }

      const parsed = Number(value)
      return Number.isNaN(parsed) ? value : parsed
    },
    z
      .number({ error: `${label} is required` })
      .positive(`${label} must be greater than zero`)
  )

export const insertPropertySchema = z
  .object({
    type: propertyTypeSchema,
    custom_property_type: z.string().trim().optional(),
    offer_type: offerTypeSchema,
    city: z.string().min(1, "City is required"),
    neighborhood: z.string().min(1, "Neighborhood is required"),
    custom_neighborhood: z.string().trim().optional(),
    price: requiredPositiveNumber("Price"),
    area: requiredPositiveNumber("Area"),
    specs: propertySpecsSchema.default({}),
    floors_count: optionalPositiveNumber,
    apartments_count: optionalPositiveNumber,
    shops_count: optionalPositiveNumber,
    has_annex: optionalBoolean,
    is_direct: z.boolean(),
    intermediaries: z.string().trim().optional().nullable(),
    google_maps_url: optionalGoogleMapsUrl,
    plot_letter: optionalPlotLetter,
    general_notes: z.string().trim().optional(),
    mark_urgent: z.boolean().optional(),
    owner_name: z.string().trim().min(1, "Owner name is required"),
    owner_phone: z.string().trim().min(1, "Owner phone is required"),
    private_notes: z.string().trim().optional(),
    images: z.array(z.string().url()).default([]),
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

    // Built-in cities keep cascading neighborhood validation for the static list
    // plus "أخرى". Approved dictionary districts may also appear — allow any
    // non-empty neighborhood when not using the Other sentinel.
    const neighborhoods = getNeighborhoodsForCity(data.city)
    if (
      neighborhoods.length > 0 &&
      data.neighborhood &&
      !neighborhoods.includes(data.neighborhood) &&
      !isNeighborhoodOther(data.neighborhood)
    ) {
      // Likely an approved dictionary district for this city — allowed.
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

    if (isNeighborhoodOther(data.neighborhood)) {
      const customNeighborhood = data.custom_neighborhood?.trim()
      if (!customNeighborhood || customNeighborhood.length < 2) {
        context.addIssue({
          code: "custom",
          message: "Please enter a custom neighborhood",
          path: ["custom_neighborhood"],
        })
      }
    }

    if (isLandType(data.type)) {
      if (data.specs.rooms !== undefined) {
        context.addIssue({
          code: "custom",
          message: "Rooms are not applicable for land",
          path: ["specs", "rooms"],
        })
      }

      if (data.specs.age !== undefined) {
        context.addIssue({
          code: "custom",
          message: "Age is not applicable for land",
          path: ["specs", "age"],
        })
      }
    }

    if (isBuildingType(data.type) && data.specs.rooms !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Rooms are not applicable for buildings",
        path: ["specs", "rooms"],
      })
    }
  })

export type PropertyType = z.infer<typeof propertyTypeSchema>
export type OfferType = z.infer<typeof offerTypeSchema>

export const propertyStatusSchema = z.enum([
  "available",
  "pending",
  "sold",
  "rented",
  "archived",
])

export type PropertyStatus = z.infer<typeof propertyStatusSchema>

export type InsertPropertyInput = {
  type: PropertyType
  custom_property_type?: string
  offer_type: OfferType
  city: string
  neighborhood: string
  custom_neighborhood?: string
  price: number
  area: number
  specs: {
    rooms?: number
    age?: number
    street_width?: number
    plan_number?: string
    plot_number?: string
    floor?: number
    project_name?: string
    notes?: string
  }
  floors_count?: number
  apartments_count?: number
  shops_count?: number
  has_annex?: boolean
  is_direct: boolean
  intermediaries?: string | null
  google_maps_url?: string | null
  plot_letter?: string | null
  general_notes?: string
  mark_urgent?: boolean
  owner_name: string
  owner_phone: string
  private_notes?: string
  images: string[]
}

export const updatePropertySchema = insertPropertySchema.extend({
  propertyId: z.string().uuid("Invalid property."),
})

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>

export type InsertPropertyFormValues = {
  type: PropertyType
  custom_property_type?: string
  offer_type: OfferType
  city: string
  neighborhood: string
  custom_neighborhood?: string
  price?: string | number
  area?: string | number
  specs: {
    rooms?: string | number
    age?: string | number
    street_width?: string | number
    plan_number?: string
    plot_number?: string
    floor?: string | number
    project_name?: string
    notes?: string
  }
  floors_count?: string | number
  apartments_count?: string | number
  shops_count?: string | number
  has_annex?: boolean
  is_direct: boolean
  intermediaries?: string | null
  google_maps_url?: string | null
  plot_letter?: string | null
  general_notes?: string
  mark_urgent?: boolean
  owner_name: string
  owner_phone: string
  private_notes?: string
}

export { OTHER_OPTION, PROPERTY_TYPE_VALUES }
