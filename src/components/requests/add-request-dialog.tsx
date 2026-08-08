"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { loadDistrictOptionsAction } from "@/actions/dictionary"
import { addRequest } from "@/actions/request"
import { checkUrgentRequestConflict } from "@/actions/urgent"
import { MarkUrgentField } from "@/components/forms/mark-urgent-field"
import { UrgentTransferDialog } from "@/components/forms/urgent-transfer-dialog"
import { LiveOpportunityPanel } from "@/components/intelligence/live-opportunity-panel"
import { RequestBasicFields } from "@/components/requests/form/request-basic-fields"
import { RequestBudgetFields } from "@/components/requests/form/request-budget-fields"
import { RequestDetailsField } from "@/components/requests/form/request-details-field"
import { RequestLocationFields } from "@/components/requests/form/request-location-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { EASTERN_CITY_NAMES } from "@/lib/constants/locations"
import { PROPERTY_TYPE_VALUES } from "@/lib/constants/property-types"
import { isCityOther } from "@/lib/dictionary-ui"
import {
  insertRequestSchema,
  type InsertRequestFormValues,
  type InsertRequestInput,
} from "@/types/request"

type AddRequestDialogProps = {
  cityOptions?: string[]
  approvedPropertyTypes?: string[]
}

export function AddRequestDialog({
  cityOptions,
  approvedPropertyTypes = [],
}: AddRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [urgentTransferDialogOpen, setUrgentTransferDialogOpen] = useState(false)
  const [customCity, setCustomCity] = useState("")
  const [districtOptions, setDistrictOptions] = useState<string[]>([])
  const t = useTranslations("requests")
  const tErrors = useTranslations("errors")
  const tDict = useTranslations("dictionary")

  const cities = cityOptions?.length ? cityOptions : EASTERN_CITY_NAMES

  const form = useForm<InsertRequestFormValues>({
    resolver: zodResolver(
      insertRequestSchema
    ) as Resolver<InsertRequestFormValues>,
    defaultValues: {
      type: "villa",
      custom_property_type: "",
      offer_type: "sale",
      city: "",
      neighborhood: "",
      custom_neighborhood: "",
      details: "",
      budget_min: undefined,
      budget_max: undefined,
      area_min: undefined,
      area_max: undefined,
      mark_urgent: false,
    },
  })

  const selectedCity = form.watch("city")
  const selectedType = form.watch("type")
  const selectedNeighborhood = form.watch("neighborhood")
  const opportunityInput = {
    direction: "request_to_properties" as const,
    type: selectedType === "other" ? "other" : selectedType,
    offer_type: form.watch("offer_type"),
    city: isCityOther(selectedCity) ? customCity : selectedCity,
    neighborhood: selectedNeighborhood,
    custom_neighborhood: form.watch("custom_neighborhood"),
    budget_min: form.watch("budget_min")
      ? Number(form.watch("budget_min"))
      : null,
    budget_max: form.watch("budget_max")
      ? Number(form.watch("budget_max"))
      : null,
    area_min: form.watch("area_min") ? Number(form.watch("area_min")) : null,
    area_max: form.watch("area_max") ? Number(form.watch("area_max")) : null,
  }

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

  async function handleMarkUrgentToggle(checked: boolean) {
    if (!checked) {
      form.setValue("mark_urgent", false)
      return
    }

    const { hasConflict } = await checkUrgentRequestConflict()

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

  async function onSubmit(values: InsertRequestFormValues) {
    const payload = { ...values }

    if (isCityOther(payload.city)) {
      const nextCity = customCity.trim()
      if (nextCity.length < 2) {
        toast.error(tDict("customCityRequired"))
        return
      }
      payload.city = nextCity
    }

    if (
      payload.type &&
      !(PROPERTY_TYPE_VALUES as readonly string[]).includes(payload.type)
    ) {
      payload.custom_property_type = payload.type
      payload.type = "other"
    }

    const parsed = insertRequestSchema.safeParse(payload)

    if (!parsed.success) {
      toast.error(tErrors("formFields"))
      return
    }

    const result = await addRequest(parsed.data as InsertRequestInput)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(t("toastPosted"))
    form.reset()
    setCustomCity("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 sm:w-auto">
          <PlusCircleIcon className="size-4" />
          {t("postNew")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <RequestBasicFields
              control={form.control}
              approvedPropertyTypes={approvedPropertyTypes}
            />

            <RequestLocationFields
              control={form.control}
              cities={cities}
              customCity={customCity}
              onCustomCityChange={setCustomCity}
              districtOptions={districtOptions}
            />

            <RequestBudgetFields control={form.control} />

            <RequestDetailsField control={form.control} />

            <MarkUrgentField
              control={form.control}
              hintKey="markHintRequest"
              onCheckedChange={handleMarkUrgentToggle}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("posting") : t("postRequest")}
            </Button>

            <LiveOpportunityPanel input={opportunityInput} />
          </form>
        </Form>

        <UrgentTransferDialog
          open={urgentTransferDialogOpen}
          onOpenChange={setUrgentTransferDialogOpen}
          onConfirm={confirmUrgentTransfer}
          onCancel={cancelUrgentTransfer}
          entity="request"
        />
      </DialogContent>
    </Dialog>
  )
}
