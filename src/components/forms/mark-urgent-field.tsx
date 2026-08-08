"use client"

import type { Control, FieldValues, Path } from "react-hook-form"
import { useTranslations } from "next-intl"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { URGENT_SWITCH_SURFACE_CLASS } from "@/lib/ui/badge-styles"
import { cn } from "@/lib/utils"

type MarkUrgentFieldProps<T extends FieldValues> = {
  control: Control<T>
  name?: Path<T>
  hintKey: "markHintProperty" | "markHintRequest"
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function MarkUrgentField<T extends FieldValues>({
  control,
  name = "mark_urgent" as Path<T>,
  hintKey,
  onCheckedChange,
  className,
}: MarkUrgentFieldProps<T>) {
  const t = useTranslations("urgent")

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex items-center justify-between rounded-lg border p-4",
            URGENT_SWITCH_SURFACE_CLASS,
            className
          )}
        >
          <div className="space-y-0.5">
            <FormLabel>{t("markLabel")}</FormLabel>
            <FormDescription>{t(hintKey)}</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={onCheckedChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
