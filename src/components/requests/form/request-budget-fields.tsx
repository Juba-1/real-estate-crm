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
import { Input } from "@/components/ui/input"
import type { InsertRequestFormValues } from "@/types/request"

type RequestBudgetFieldsProps = {
  control: Control<InsertRequestFormValues>
}

export function RequestBudgetFields({ control }: RequestBudgetFieldsProps) {
  const tFields = useTranslations("fields")

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="budget_min"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("budgetMin")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="budget_max"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("budgetMax")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="area_min"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("areaMin")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="area_max"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("areaMax")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
