"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { addProperty, updateProperty } from "@/actions/property"
import {
  checkPropertyIdentity,
  logIdentityEvent,
} from "@/actions/intelligence/identity"
import { checkUrgentPropertyConflict } from "@/actions/urgent"
import { loadDistrictOptionsAction } from "@/actions/dictionary"
import { UrgentTransferDialog } from "@/components/forms/urgent-transfer-dialog"
import { IdentityWarningDialog } from "@/components/intelligence/identity-warning-dialog"
import { LiveOpportunityPanel } from "@/components/intelligence/live-opportunity-panel"
import { normalizePropertyFormPayload } from "@/components/properties/form/normalize-property-payload"
import { PropertyBasicSection } from "@/components/properties/form/property-basic-section"
import { PropertyDetailsSection } from "@/components/properties/form/property-details-section"
import { PropertyLocationSection } from "@/components/properties/form/property-location-section"
import { PropertyMapsSection } from "@/components/properties/form/property-maps-section"
import { PropertyMediaSection } from "@/components/properties/form/property-media-section"
import { PropertyOwnerSection } from "@/components/properties/form/property-owner-section"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { useRouter } from "@/i18n/navigation"
import { isQuotaExceededResult } from "@/lib/quota"
import { EASTERN_CITY_NAMES } from "@/lib/constants/locations"
import {
  isNeighborhoodOther,
  isPropertyTypeOther,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import { isCityOther } from "@/lib/dictionary-ui"
import { uploadPropertyImages } from "@/lib/supabase/storage"
import { createClient } from "@/lib/supabase/client"
import {
  insertPropertySchema,
  type InsertPropertyFormValues,
  type InsertPropertyInput,
  type UpdatePropertyInput,
} from "@/types/property"
import type {
  IdentityMatchResult,
  IdentityOverride,
} from "@/types/intelligence/identity"

const EMPTY_DEFAULT_VALUES: InsertPropertyFormValues = {
  type: "apartment",
  custom_property_type: "",
  offer_type: "sale",
  city: "",
  neighborhood: "",
  custom_neighborhood: "",
  price: undefined,
  area: undefined,
  specs: {
    rooms: undefined,
    age: undefined,
    street_width: undefined,
    plan_number: "",
    plot_number: "",
    floor: undefined,
    project_name: "",
    notes: "",
  },
  floors_count: undefined,
  apartments_count: undefined,
  shops_count: undefined,
  has_annex: false,
  is_direct: true,
  intermediaries: "",
  google_maps_url: "",
  plot_letter: "",
  general_notes: "",
  mark_urgent: false,
  owner_name: "",
  owner_phone: "",
  private_notes: "",
}

type PropertyFormProps = {
  companyId: string | null
  mode?: "add" | "edit"
  propertyId?: string
  initialValues?: InsertPropertyFormValues
  existingImageUrls?: string[]
  cityOptions?: string[]
  approvedPropertyTypes?: string[]
}

export function AddPropertyForm({
  companyId,
  mode = "add",
  propertyId,
  initialValues,
  existingImageUrls = [],
  cityOptions,
  approvedPropertyTypes = [],
}: PropertyFormProps) {
  const t = useTranslations("addProperty")
  const tErrors = useTranslations("errors")
  const tDict = useTranslations("dictionary")
  const router = useRouter()
  const isEditMode = mode === "edit"
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const [urgentTransferDialogOpen, setUrgentTransferDialogOpen] = useState(false)
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false)
  const [identityMatch, setIdentityMatch] = useState<IdentityMatchResult | null>(
    null
  )
  const [pendingIdentityOverride, setPendingIdentityOverride] =
    useState<IdentityOverride | null>(null)
  const [pendingSavePayload, setPendingSavePayload] =
    useState<InsertPropertyInput | null>(null)
  const [keptExistingUrls, setKeptExistingUrls] = useState(existingImageUrls)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [customCity, setCustomCity] = useState("")
  const [districtOptions, setDistrictOptions] = useState<string[]>([])

  const cities = cityOptions?.length ? cityOptions : EASTERN_CITY_NAMES
  const typeOptions = [
    ...PROPERTY_TYPE_VALUES.filter((value) => value !== "other"),
    ...approvedPropertyTypes,
    "other" as const,
  ]

  const form = useForm<InsertPropertyFormValues>({
    resolver: zodResolver(
      insertPropertySchema
    ) as Resolver<InsertPropertyFormValues>,
    defaultValues: initialValues ?? EMPTY_DEFAULT_VALUES,
  })

  const selectedCity = form.watch("city")
  const selectedType = form.watch("type")
  const selectedNeighborhood = form.watch("neighborhood")
  const watchedArea = form.watch("area")
  const watchedPrice = form.watch("price")
  const watchedOffer = form.watch("offer_type")
  const opportunityInput = {
    direction: "property_to_requests" as const,
    type: selectedType,
    offer_type: watchedOffer,
    city: isCityOther(selectedCity) ? customCity : selectedCity,
    neighborhood: selectedNeighborhood,
    custom_neighborhood: form.watch("custom_neighborhood"),
    area: watchedArea ? Number(watchedArea) : null,
    price: watchedPrice ? Number(watchedPrice) : null,
    exclude_id: isEditMode ? propertyId : null,
  }
  const isDirect = form.watch("is_direct")
  const showCustomType = isPropertyTypeOther(selectedType)
  const showCustomNeighborhood = isNeighborhoodOther(selectedNeighborhood)
  const showCustomCity = isCityOther(selectedCity)
  const isBusy = form.formState.isSubmitting || isUploadingImages

  useEffect(() => {
    let cancelled = false

    async function loadDistricts() {
      if (!selectedCity || isCityOther(selectedCity)) {
        setDistrictOptions([])
        return
      }

      const options = await loadDistrictOptionsAction(selectedCity)
      if (!cancelled) {
        setDistrictOptions(options)
      }
    }

    void loadDistricts()
    return () => {
      cancelled = true
    }
  }, [selectedCity])

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [imagePreviews])

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const imageOnlyFiles = files.filter((file) => file.type.startsWith("image/"))
    if (imageOnlyFiles.length !== files.length) {
      setSubmitError(tErrors("imagesOnly"))
    }

    setImageFiles((current) => [...current, ...imageOnlyFiles])
    setImagePreviews((current) => [
      ...current,
      ...imageOnlyFiles.map((file) => URL.createObjectURL(file)),
    ])
    event.target.value = ""
  }

  function removeExistingImage(index: number) {
    setKeptExistingUrls((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    )
  }

  function removeNewImage(index: number) {
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
    setImagePreviews((current) => {
      const next = [...current]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed)
      }
      return next
    })
  }

  async function handleMarkUrgentToggle(checked: boolean) {
    if (!checked) {
      form.setValue("mark_urgent", false)
      return
    }

    const { hasConflict } = await checkUrgentPropertyConflict(propertyId)

    if (hasConflict) {
      setUrgentTransferDialogOpen(true)
      return
    }

    form.setValue("mark_urgent", true)
  }

  function confirmUrgentTransfer() {
    form.setValue("mark_urgent", true)
    setUrgentTransferDialogOpen(false)
  }

  function cancelUrgentTransfer() {
    form.setValue("mark_urgent", false)
    setUrgentTransferDialogOpen(false)
  }

  async function finalizeSave(
    data: InsertPropertyInput,
    identityOverride: IdentityOverride | null
  ) {
    if (imageFiles.length > 0 && !companyId) {
      setSubmitError(tErrors("companyRequiredForImages"))
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (imageFiles.length > 0 && !user) {
      setSubmitError(tErrors("uploadFailed"))
      return
    }

    let newImageUrls: string[] = []

    if (imageFiles.length > 0 && companyId && user) {
      setIsUploadingImages(true)
      setUploadProgress({ completed: 0, total: imageFiles.length })

      try {
        newImageUrls = await uploadPropertyImages(
          imageFiles,
          companyId,
          user.id,
          (completed, total) => {
            setUploadProgress({ completed, total })
          }
        )
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : tErrors("uploadFailed")
        )
        setIsUploadingImages(false)
        setUploadProgress(null)
        return
      } finally {
        setIsUploadingImages(false)
        setUploadProgress(null)
      }
    }

    const allImages = [...keptExistingUrls, ...newImageUrls]
    const options = identityOverride
      ? { identity_override: identityOverride }
      : undefined

    if (isEditMode && propertyId) {
      const result = await updateProperty(
        {
          ...data,
          propertyId,
          images: allImages,
        } as UpdatePropertyInput,
        options
      )

      if (result?.error) {
        setSubmitError(result.error)
        return
      }

      toast.success(t("toastUpdated"))
      router.push("/dashboard/my-properties")
      return
    }

    const result = await addProperty(
      {
        ...data,
        images: allImages,
      },
      options
    )

    if (result?.error) {
      if (isQuotaExceededResult(result)) {
        toast.error(tErrors("quotaExceeded"))
        setSubmitError(tErrors("quotaExceeded"))
        return
      }

      setSubmitError(result.error)
    }
  }

  async function onSubmit(values: InsertPropertyFormValues) {
    setSubmitError(null)

    const normalized = normalizePropertyFormPayload(values, {
      customCity,
      isCityOther,
    })

    if (!normalized.ok) {
      setSubmitError(
        normalized.code === "custom_city_required"
          ? tDict("customCityRequired")
          : tErrors("formFields")
      )
      return
    }

    if (!pendingIdentityOverride) {
      const check = await checkPropertyIdentity(
        normalized.data,
        isEditMode ? propertyId : null
      )

      if (check.warn && check.matches[0]) {
        setIdentityMatch(check.matches[0])
        setPendingSavePayload(normalized.data)
        setIdentityDialogOpen(true)
        void logIdentityEvent({
          event_type: "warning_shown",
          related_entity_id: check.matches[0].property_id,
          confidence: check.matches[0].confidence,
          payload: {
            confidence_breakdown: check.matches[0].confidence_breakdown,
            reasons: check.matches[0].reasons,
          },
        })
        return
      }
    }

    const override = pendingIdentityOverride
    setPendingIdentityOverride(null)
    await finalizeSave(normalized.data, override)
  }

  function cancelIdentityWarning() {
    setIdentityDialogOpen(false)
    if (identityMatch) {
      void logIdentityEvent({
        event_type: "cancelled",
        related_entity_id: identityMatch.property_id,
        confidence: identityMatch.confidence,
      })
    }
    setIdentityMatch(null)
    setPendingSavePayload(null)
  }

  function continueDespiteIdentity() {
    if (!identityMatch || !pendingSavePayload) {
      return
    }

    const override: IdentityOverride = {
      acknowledged: true,
      match_property_id: identityMatch.property_id,
      confidence: identityMatch.confidence,
    }
    const pending = pendingSavePayload
    setPendingIdentityOverride(null)
    setIdentityDialogOpen(false)
    setIdentityMatch(null)
    setPendingSavePayload(null)
    void finalizeSave(pending, override)
  }

  function openExistingFromIdentity(matchPropertyId: string) {
    if (identityMatch) {
      void logIdentityEvent({
        event_type: "opened_existing",
        related_entity_id: matchPropertyId,
        confidence: identityMatch.confidence,
      })
    }
    setIdentityDialogOpen(false)
    setIdentityMatch(null)
    setPendingSavePayload(null)
    router.push("/dashboard/properties/" + matchPropertyId + "/edit")
  }

  return (
    <Form {...form}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <PropertyBasicSection
            control={form.control}
            setValue={form.setValue}
            watch={form.watch}
            typeOptions={typeOptions}
            approvedPropertyTypes={approvedPropertyTypes}
            showCustomType={showCustomType}
          />

          <PropertyLocationSection
            control={form.control}
            setValue={form.setValue}
            cities={cities}
            selectedCity={selectedCity}
            districtOptions={districtOptions}
            showCustomCity={showCustomCity}
            showCustomNeighborhood={showCustomNeighborhood}
            customCity={customCity}
            onCustomCityChange={setCustomCity}
            neighborhoodOpen={neighborhoodOpen}
            onNeighborhoodOpenChange={setNeighborhoodOpen}
          />

          <PropertyDetailsSection
            control={form.control}
            selectedType={selectedType}
            isDirect={isDirect}
            onMarkUrgentToggle={handleMarkUrgentToggle}
          >
            <PropertyMapsSection control={form.control} />
            <PropertyMediaSection
              keptExistingUrls={keptExistingUrls}
              imagePreviews={imagePreviews}
              uploadProgress={uploadProgress}
              isBusy={isBusy}
              onImageSelection={handleImageSelection}
              onRemoveExistingImage={removeExistingImage}
              onRemoveNewImage={removeNewImage}
            />
          </PropertyDetailsSection>

          <PropertyOwnerSection control={form.control} />

          {submitError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {submitError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
              {isUploadingImages
                ? t("uploadingImages", {
                    completed: uploadProgress?.completed ?? 0,
                    total: uploadProgress?.total ?? imageFiles.length,
                  })
                : form.formState.isSubmitting
                  ? isEditMode
                    ? t("updatingProperty")
                    : t("savingProperty")
                  : isEditMode
                    ? t("updateProperty")
                    : t("saveProperty")}
            </Button>
          </div>
        </form>
        <LiveOpportunityPanel
          input={opportunityInput}
          className="lg:sticky lg:top-4"
        />
      </div>

      <UrgentTransferDialog
        open={urgentTransferDialogOpen}
        onOpenChange={setUrgentTransferDialogOpen}
        onConfirm={confirmUrgentTransfer}
        onCancel={cancelUrgentTransfer}
        entity="property"
      />

      <IdentityWarningDialog
        open={identityDialogOpen}
        match={identityMatch}
        onContinue={continueDespiteIdentity}
        onCancel={cancelIdentityWarning}
        onOpenExisting={openExistingFromIdentity}
      />
    </Form>
  )
}
