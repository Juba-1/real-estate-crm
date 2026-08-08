"use client"

import type { Control } from "react-hook-form"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import {
  isPropertyTypeOther,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import type { InsertRequestFormValues } from "@/types/request"
import type { OfferType, PropertyType } from "@/types/property"

const OFFER_TYPES: OfferType[] = ["sale", "rent"]

type RequestBasicFieldsProps = {
  control: Control<InsertRequestFormValues>
  approvedPropertyTypes?: string[]
}

export function RequestBasicFields({
  control,
  approvedPropertyTypes = [],
}: RequestBasicFieldsProps) {
  const { setValue } = useFormContext<InsertRequestFormValues>()
  const tFields = useTranslations("fields")
  const tProps = useTranslations("properties")
  const tPlaceholders = useTranslations("placeholders")
  const { propertyType, offerType } = usePropertyLabels()

  const selectedType = useWatch({ control, name: "type" })
  const customPropertyType = useWatch({
    control,
    name: "custom_property_type",
  })
  const showCustomType = isPropertyTypeOther(selectedType)

  const typeOptions = [
    ...PROPERTY_TYPE_VALUES.filter((value) => value !== "other"),
    ...approvedPropertyTypes,
    "other" as const,
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tProps("propertyType")}</FormLabel>
            <Select
              onValueChange={(value) => {
                if (
                  (PROPERTY_TYPE_VALUES as readonly string[]).includes(value)
                ) {
                  field.onChange(value)
                  if (value !== "other") {
                    setValue("custom_property_type", "")
                  }
                  return
                }

                field.onChange("other")
                setValue("custom_property_type", value)
              }}
              value={
                field.value === "other" &&
                customPropertyType &&
                approvedPropertyTypes.includes(customPropertyType ?? "")
                  ? (customPropertyType ?? "other")
                  : field.value
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tPlaceholders("selectType")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {(PROPERTY_TYPE_VALUES as readonly string[]).includes(type)
                      ? propertyType(type as PropertyType)
                      : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {showCustomType ? (
        <FormField
          control={control}
          name="custom_property_type"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{tFields("customPropertyType")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={tPlaceholders("customPropertyType")}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={control}
        name="offer_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("offerType")}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tPlaceholders("selectOffer")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OFFER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {offerType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
