import { normalizePropertyType } from "@/lib/constants/property-types"
import type { EditableProperty } from "@/lib/data/properties"
import type { InsertPropertyFormValues, PropertyType } from "@/types/property"

export function editablePropertyToFormValues(
  property: EditableProperty
): InsertPropertyFormValues {
  const specs = property.specs ?? {}

  return {
    type: normalizePropertyType(property.type) as PropertyType,
    custom_property_type: property.custom_property_type ?? "",
    offer_type: property.offer_type,
    city: property.city,
    neighborhood: property.neighborhood,
    custom_neighborhood: property.custom_neighborhood ?? "",
    price: Number(property.price),
    area: Number(property.area),
    specs: {
      rooms:
        typeof specs.rooms === "number" ? specs.rooms : undefined,
      age: typeof specs.age === "number" ? specs.age : undefined,
      street_width:
        typeof specs.street_width === "number" ? specs.street_width : undefined,
      plan_number:
        typeof specs.plan_number === "string" ? specs.plan_number : "",
      plot_number:
        typeof specs.plot_number === "string" ? specs.plot_number : "",
      notes: typeof specs.notes === "string" ? specs.notes : "",
    },
    floors_count: property.floors_count ?? undefined,
    apartments_count: property.apartments_count ?? undefined,
    shops_count: property.shops_count ?? undefined,
    has_annex: property.has_annex ?? false,
    is_direct: property.is_direct,
    general_notes: property.general_notes ?? "",
    owner_name: property.property_owners[0]?.owner_name ?? "",
    owner_phone: property.property_owners[0]?.owner_phone ?? "",
    private_notes: property.property_owners[0]?.private_notes ?? "",
  }
}
