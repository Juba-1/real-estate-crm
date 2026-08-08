"use client"

import type { Control } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import type { InsertPropertyFormValues } from "@/types/property"

type PropertyOwnerSectionProps = {
  control: Control<InsertPropertyFormValues>
}

export function PropertyOwnerSection({ control }: PropertyOwnerSectionProps) {
  const t = useTranslations("addProperty")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle>{t("confidentialTitle")}</CardTitle>
        <CardDescription>{t("confidentialDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="owner_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("ownerName")}</FormLabel>
              <FormControl>
                <Input placeholder={tPlaceholders("ownerName")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="owner_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tFields("ownerPhone")}</FormLabel>
              <FormControl>
                <Input placeholder={tPlaceholders("ownerPhone")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="private_notes"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{tFields("privateNotes")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={tPlaceholders("privateNotes")}
                  className="min-h-24 resize-y"
                  {...field}
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
