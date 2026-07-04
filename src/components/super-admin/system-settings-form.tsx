"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { saveSystemSettings } from "@/actions/settings"
import type { SystemSettingsInput } from "@/types/settings"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  systemSettingsSchema,
} from "@/types/settings"
import { Button } from "@/components/ui/button"

type SystemSettingsFormProps = {
  initialSettings: SystemSettingsInput
}

export function SystemSettingsForm({
  initialSettings,
}: SystemSettingsFormProps) {
  const t = useTranslations("superAdmin")
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<SystemSettingsInput>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: initialSettings,
  })

  async function onSubmit(values: SystemSettingsInput) {
    setIsSaving(true)

    try {
      const result = await saveSystemSettings(values)

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastSettingsSaved"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{t("settingsCardTitle")}</CardTitle>
        <CardDescription>{t("settingsCardDescription")}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="platformName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settingsPlatformName")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("settingsPlatformNamePlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settingsSupportEmail")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      dir="ltr"
                      className="text-start"
                      placeholder={t("settingsSupportEmailPlaceholder")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settingsDefaultCurrency")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled readOnly className="bg-muted/50" />
                  </FormControl>
                  <FormDescription>{t("settingsDefaultCurrencyHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maintenanceMode"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-4">
                  <div className="space-y-1">
                    <FormLabel className="text-base">
                      {t("settingsMaintenanceMode")}
                    </FormLabel>
                    <FormDescription>
                      {t("settingsMaintenanceModeHint")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t("settingsMaintenanceMode")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t bg-muted/10">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("savingSettings")}
                </>
              ) : (
                t("saveSettings")
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
