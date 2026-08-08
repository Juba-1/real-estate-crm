"use client"

import type { Control } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import type { InsertRequestFormValues } from "@/types/request"

type RequestDetailsFieldProps = {
  control: Control<InsertRequestFormValues>
}

export function RequestDetailsField({ control }: RequestDetailsFieldProps) {
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <FormField
      control={control}
      name="details"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{tFields("details")}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={tPlaceholders("requestDetails")}
              className="min-h-24 resize-y"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
