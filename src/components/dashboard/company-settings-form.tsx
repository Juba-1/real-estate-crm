"use client"

import { ImageIcon, Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { updateCompanyLogo } from "@/actions/company-settings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { uploadCompanyLogo } from "@/lib/supabase/storage"
import type { CompanyBranding } from "@/lib/data/company"

type CompanySettingsFormProps = {
  company: CompanyBranding
}

export function CompanySettingsForm({ company }: CompanySettingsFormProps) {
  const t = useTranslations("companySettings")
  const tErrors = useTranslations("errors")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    company.logo_url
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (logoFile && previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [logoFile, previewUrl])

  function handleLogoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error(t("invalidImageType"))
      return
    }

    setLogoFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!logoFile && previewUrl === company.logo_url) {
      toast.message(t("noChanges"))
      return
    }

    if (!logoFile) {
      toast.error(t("selectLogoFirst"))
      return
    }

    setIsSaving(true)

    try {
      const logoUrl = await uploadCompanyLogo(logoFile, company.id)
      const result = await updateCompanyLogo(logoUrl)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setLogoFile(null)
      setPreviewUrl(logoUrl)
      toast.success(t("toastLogoSaved"))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tErrors("uploadFailed")
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{t("logoSectionTitle")}</CardTitle>
        <CardDescription>{t("logoSectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-xl border bg-muted/30 p-4 sm:w-48">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={company.name}
                className="max-h-16 w-auto max-w-full object-contain"
              />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("uploadLogo")}</p>
            <p className="text-xs text-muted-foreground">{t("logoHint")}</p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={isSaving}
              asChild
            >
              <label className="cursor-pointer">
                <ImageIcon className="size-4" />
                {t("chooseLogo")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isSaving}
                  onChange={handleLogoSelection}
                />
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/10">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t("savingChanges")}
            </>
          ) : (
            t("saveChanges")
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
