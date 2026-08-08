"use client"

import type { Control } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { InsertPropertyFormValues } from "@/types/property"

type PropertyMapsSectionProps = {
  control: Control<InsertPropertyFormValues>
}

export function PropertyMapsSection({ control }: PropertyMapsSectionProps) {
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <FormField
      control={control}
      name="google_maps_url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{tFields("googleMapsLocation")}</FormLabel>
          <FormDescription>
            {tFields("googleMapsLocationHint")}
          </FormDescription>
          <FormControl>
            <Input
              type="url"
              inputMode="url"
              placeholder={tPlaceholders("googleMapsUrl")}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
