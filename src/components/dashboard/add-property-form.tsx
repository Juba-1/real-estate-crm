"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  ImageIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { addProperty, updateProperty } from "@/actions/property"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import { useRouter } from "@/i18n/navigation"
import { isQuotaExceededResult } from "@/lib/quota"
import {
  EASTERN_CITY_NAMES,
  getNeighborhoodsForCity,
} from "@/lib/constants/locations"
import {
  isNeighborhoodOther,
  isPropertyTypeOther,
  PROPERTY_TYPE_VALUES,
  shouldShowAge,
  shouldShowAnnexField,
  shouldShowBuildingFields,
  shouldShowLandFields,
  shouldShowRooms,
  shouldShowStreetWidth,
} from "@/lib/constants/property-types"
import { uploadPropertyImages } from "@/lib/supabase/storage"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  insertPropertySchema,
  type InsertPropertyFormValues,
  type InsertPropertyInput,
  type OfferType,
  type PropertyType,
  type UpdatePropertyInput,
} from "@/types/property"

const OFFER_TYPES: OfferType[] = ["sale", "rent"]

const EMPTY_DEFAULT_VALUES: InsertPropertyFormValues = {
  type: "apartment",
  custom_property_type: "",
  offer_type: "sale",
  city: "",
  neighborhood: "",
  custom_neighborhood: "",
  price: undefined,
  area: undefined,
  specs: {
    rooms: undefined,
    age: undefined,
    street_width: undefined,
    plan_number: "",
    plot_number: "",
    notes: "",
  },
  floors_count: undefined,
  apartments_count: undefined,
  shops_count: undefined,
  has_annex: false,
  is_direct: true,
  intermediaries: "",
  general_notes: "",
  owner_name: "",
  owner_phone: "",
  private_notes: "",
}

type PropertyFormProps = {
  companyId: string | null
  mode?: "add" | "edit"
  propertyId?: string
  initialValues?: InsertPropertyFormValues
  existingImageUrls?: string[]
}

export function AddPropertyForm({
  companyId,
  mode = "add",
  propertyId,
  initialValues,
  existingImageUrls = [],
}: PropertyFormProps) {
  const t = useTranslations("addProperty")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tErrors = useTranslations("errors")
  const tProps = useTranslations("properties")
  const router = useRouter()
  const isEditMode = mode === "edit"
  const { propertyType, offerType } = usePropertyLabels()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const [keptExistingUrls, setKeptExistingUrls] = useState(existingImageUrls)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const form = useForm<InsertPropertyFormValues>({
    resolver: zodResolver(
      insertPropertySchema
    ) as Resolver<InsertPropertyFormValues>,
    defaultValues: initialValues ?? EMPTY_DEFAULT_VALUES,
  })

  const selectedCity = form.watch("city")
  const selectedType = form.watch("type")
  const selectedNeighborhood = form.watch("neighborhood")
  const isDirect = form.watch("is_direct")
  const showCustomType = isPropertyTypeOther(selectedType)
  const showCustomNeighborhood = isNeighborhoodOther(selectedNeighborhood)
  const neighborhoods = getNeighborhoodsForCity(selectedCity)
  const isBusy = form.formState.isSubmitting || isUploadingImages

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [imagePreviews])

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const imageOnlyFiles = files.filter((file) => file.type.startsWith("image/"))
    if (imageOnlyFiles.length !== files.length) {
      setSubmitError(tErrors("imagesOnly"))
    }

    setImageFiles((current) => [...current, ...imageOnlyFiles])
    setImagePreviews((current) => [
      ...current,
      ...imageOnlyFiles.map((file) => URL.createObjectURL(file)),
    ])
    event.target.value = ""
  }

  function removeExistingImage(index: number) {
    setKeptExistingUrls((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    )
  }

  function removeNewImage(index: number) {
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
    setImagePreviews((current) => {
      const next = [...current]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed)
      }
      return next
    })
  }

  async function onSubmit(values: InsertPropertyFormValues) {
    setSubmitError(null)
    const parsed = insertPropertySchema.safeParse(values)

    if (!parsed.success) {
      setSubmitError(tErrors("fixFields"))
      return
    }

    if (imageFiles.length > 0 && !companyId) {
      setSubmitError(tErrors("companyRequiredForImages"))
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (imageFiles.length > 0 && !user) {
      setSubmitError(tErrors("uploadFailed"))
      return
    }

    let newImageUrls: string[] = []

    if (imageFiles.length > 0 && companyId && user) {
      setIsUploadingImages(true)
      setUploadProgress({ completed: 0, total: imageFiles.length })

      try {
        newImageUrls = await uploadPropertyImages(
          imageFiles,
          companyId,
          user.id,
          (completed, total) => {
            setUploadProgress({ completed, total })
          }
        )
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : tErrors("uploadFailed")
        )
        setIsUploadingImages(false)
        setUploadProgress(null)
        return
      } finally {
        setIsUploadingImages(false)
        setUploadProgress(null)
      }
    }

    const allImages = [...keptExistingUrls, ...newImageUrls]

    if (isEditMode && propertyId) {
      const result = await updateProperty({
        ...(parsed.data as UpdatePropertyInput),
        propertyId,
        images: allImages,
      })

      if (result?.error) {
        setSubmitError(result.error)
        return
      }

      toast.success(t("toastUpdated"))
      router.push("/dashboard/my-properties")
      return
    }

    const result = await addProperty({
      ...(parsed.data as InsertPropertyInput),
      images: allImages,
    })

    if (result?.error) {
      if (isQuotaExceededResult(result)) {
        toast.error(tErrors("quotaExceeded"))
        setSubmitError(tErrors("quotaExceeded"))
        return
      }

      setSubmitError(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("publicTitle")}</CardTitle>
            <CardDescription>{t("publicDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tProps("propertyType")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tPlaceholders("selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROPERTY_TYPE_VALUES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {propertyType(type)}
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
                control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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

        <Card>
          <CardHeader>
            <CardTitle>{t("locationTitle")}</CardTitle>
            <CardDescription>{t("locationDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("city")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue("neighborhood", "")
                      form.setValue("custom_neighborhood", "")
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tPlaceholders("selectCity")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EASTERN_CITY_NAMES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{tFields("neighborhood")}</FormLabel>
                  <Popover open={neighborhoodOpen} onOpenChange={setNeighborhoodOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          disabled={!selectedCity}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value || tPlaceholders("selectNeighborhood")}
                          <ChevronsUpDownIcon className="size-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={tPlaceholders("searchNeighborhood")} />
                        <CommandList>
                          <CommandEmpty>{tPlaceholders("noNeighborhood")}</CommandEmpty>
                          <CommandGroup>
                            {neighborhoods.map((neighborhood) => (
                              <CommandItem
                                key={neighborhood}
                                value={neighborhood}
                                onSelect={() => {
                                  field.onChange(neighborhood)
                                  if (!isNeighborhoodOther(neighborhood)) {
                                    form.setValue("custom_neighborhood", "")
                                  }
                                  setNeighborhoodOpen(false)
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "size-4",
                                    neighborhood === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {neighborhood}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCustomNeighborhood ? (
              <FormField
                control={form.control}
                name="custom_neighborhood"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{tFields("customNeighborhood")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("customNeighborhood")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("detailsTitle")}</CardTitle>
            <CardDescription>{t("detailsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="is_direct"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>{tFields("directWithOwner")}</FormLabel>
                    <FormDescription>
                      {tFields("directWithOwnerHint")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isDirect ? (
              <FormField
                control={form.control}
                name="intermediaries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("intermediaries")}</FormLabel>
                    <FormDescription>
                      {tPlaceholders("intermediaries")}
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder={tPlaceholders("intermediaries")}
                        className="min-h-24 resize-y"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              {shouldShowLandFields(selectedType) ? (
                <>
                  <FormField
                    control={form.control}
                    name="specs.plan_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tFields("planNumber")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={tPlaceholders("planNumber")}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specs.plot_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tFields("plotNumber")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={tPlaceholders("plotNumber")}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {shouldShowBuildingFields(selectedType) ? (
                <>
                  <FormField
                    control={form.control}
                    name="floors_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tFields("floorsCount")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder={tPlaceholders("floorsCount")}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apartments_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tFields("apartmentsCount")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder={tPlaceholders("apartmentsCount")}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shops_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tFields("shopsCount")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder={tPlaceholders("shopsCount")}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {shouldShowRooms(selectedType) ? (
                <FormField
                  control={form.control}
                  name="specs.rooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tFields("rooms")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={tPlaceholders("rooms")}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {shouldShowAge(selectedType) ? (
                <FormField
                  control={form.control}
                  name="specs.age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tFields("age")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={tPlaceholders("age")}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {shouldShowStreetWidth(selectedType) ? (
                <FormField
                  control={form.control}
                  name="specs.street_width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tFields("streetWidth")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={tPlaceholders("streetWidth")}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {shouldShowAnnexField(selectedType) ? (
              <FormField
                control={form.control}
                name="has_annex"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{tFields("hasAnnex")}</FormLabel>
                      <FormDescription>{tFields("hasAnnexHint")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="specs.notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("additionalSpecs")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={tPlaceholders("specsNotes")}
                      className="min-h-24 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="general_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("generalNotes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={tPlaceholders("generalNotes")}
                      className="min-h-24 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      onChange={handleImageSelection}
                    />
                  </label>
                </Button>
              </div>

              {(keptExistingUrls.length > 0 || imagePreviews.length > 0) ? (
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
                        onClick={() => removeExistingImage(index)}
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
                        alt={t("imageAlt", { index: keptExistingUrls.length + index + 1 })}
                        className="size-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-xs"
                        className="absolute end-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        disabled={isBusy}
                        onClick={() => removeNewImage(index)}
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
          </CardContent>
        </Card>

        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle>{t("confidentialTitle")}</CardTitle>
            <CardDescription>{t("confidentialDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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

        {submitError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
            {isUploadingImages
              ? t("uploadingImages", {
                  completed: uploadProgress?.completed ?? 0,
                  total: uploadProgress?.total ?? imageFiles.length,
                })
              : form.formState.isSubmitting
                ? isEditMode
                  ? t("updatingProperty")
                  : t("savingProperty")
                : isEditMode
                  ? t("updateProperty")
                  : t("saveProperty")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
