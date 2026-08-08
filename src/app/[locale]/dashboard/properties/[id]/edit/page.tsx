import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { AddPropertyForm } from "@/components/dashboard/add-property-form"
import { getApprovedDictionaryValues } from "@/lib/data/dictionary"
import { getCityOptions } from "@/lib/dictionary-catalog"
import { getPropertyForEdit } from "@/lib/data/properties"
import { editablePropertyToFormValues } from "@/lib/property-form-utils"
import { getCurrentUser } from "@/lib/data/user"

type EditPropertyPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params
  const [property, user, t, cityOptions, approvedPropertyTypes] = await Promise.all([
    getPropertyForEdit(id),
    getCurrentUser(),
    getTranslations("addProperty"),
    getCityOptions(),
    getApprovedDictionaryValues("property_type"),
  ])

  if (!property) {
    notFound()
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("editTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("editDescription")}</p>
      </div>

      <AddPropertyForm
        companyId={user?.company_id ?? null}
        mode="edit"
        propertyId={property.id}
        initialValues={editablePropertyToFormValues(property)}
        existingImageUrls={property.images}
        cityOptions={cityOptions}
        approvedPropertyTypes={approvedPropertyTypes}
      />
    </div>
  )
}
