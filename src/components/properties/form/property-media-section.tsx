"use client"

import { ImageIcon, Loader2Icon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  FormDescription,
  FormLabel,
} from "@/components/ui/form"

type PropertyMediaSectionProps = {
  keptExistingUrls: string[]
  imagePreviews: string[]
  uploadProgress: { completed: number; total: number } | null
  isBusy: boolean
  onImageSelection: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveExistingImage: (index: number) => void
  onRemoveNewImage: (index: number) => void
}

export function PropertyMediaSection({
  keptExistingUrls,
  imagePreviews,
  uploadProgress,
  isBusy,
  onImageSelection,
  onRemoveExistingImage,
  onRemoveNewImage,
}: PropertyMediaSectionProps) {
  const t = useTranslations("addProperty")

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <FormLabel>{t("imagesLabel")}</FormLabel>
          <FormDescription>{t("imagesDescription")}</FormDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          disabled={isBusy}
          asChild
        >
          <label className="cursor-pointer">
            <ImageIcon className="size-4" />
            {t("selectImages")}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={isBusy}
              onChange={onImageSelection}
            />
          </label>
        </Button>
      </div>

      {keptExistingUrls.length > 0 || imagePreviews.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {keptExistingUrls.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={t("imageAlt", { index: index + 1 })}
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute end-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                disabled={isBusy}
                onClick={() => onRemoveExistingImage(index)}
              >
                <XIcon className="size-3" />
                <span className="sr-only">{t("removeImage")}</span>
              </Button>
            </div>
          ))}
          {imagePreviews.map((preview, index) => (
            <div
              key={preview}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={t("imageAlt", {
                  index: keptExistingUrls.length + index + 1,
                })}
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute end-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                disabled={isBusy}
                onClick={() => onRemoveNewImage(index)}
              >
                <XIcon className="size-3" />
                <span className="sr-only">{t("removeImage")}</span>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
          <ImageIcon className="mb-2 size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noImages")}</p>
        </div>
      )}

      {uploadProgress ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          <Loader2Icon className="size-4 animate-spin" />
          {t("uploadProgress", {
            completed: uploadProgress.completed,
            total: uploadProgress.total,
          })}
        </div>
      ) : null}
    </div>
  )
}
