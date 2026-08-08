"use client"

import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { PROPERTY_TYPE_VALUES } from "@/lib/constants/property-types"
import type {
  InsertPropertyFormValues,
  OfferType,
  PropertyType,
} from "@/types/property"

const OFFER_TYPES: OfferType[] = ["sale", "rent"]

type PropertyBasicSectionProps = {
  control: Control<InsertPropertyFormValues>
  setValue: UseFormSetValue<InsertPropertyFormValues>
  watch: UseFormWatch<InsertPropertyFormValues>
  typeOptions: string[]
  approvedPropertyTypes: string[]
  showCustomType: boolean
}

export function PropertyBasicSection({
  control,
  setValue,
  watch,
  typeOptions,
  approvedPropertyTypes,
  showCustomType,
}: PropertyBasicSectionProps) {
  const t = useTranslations("addProperty")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tProps = useTranslations("properties")
  const { propertyType, offerType } = usePropertyLabels()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("publicTitle")}</CardTitle>
        <CardDescription>{t("publicDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  watch("custom_property_type") &&
                  approvedPropertyTypes.includes(
                    watch("custom_property_type") ?? ""
                  )
                    ? (watch("custom_property_type") ?? "other")
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
                      {(PROPERTY_TYPE_VALUES as readonly string[]).includes(
                        type
                      )
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
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

        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("priceSar")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder={tPlaceholders("price")}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("areaSqm")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder={tPlaceholders("area")}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
