"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, ChevronsUpDownIcon, PlusCircleIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { addRequest } from "@/actions/request"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import {
  EASTERN_CITY_NAMES,
  getNeighborhoodsForCity,
} from "@/lib/constants/locations"
import {
  isNeighborhoodOther,
  isPropertyTypeOther,
  PROPERTY_TYPE_VALUES,
} from "@/lib/constants/property-types"
import { cn } from "@/lib/utils"
import {
  insertRequestSchema,
  type InsertRequestFormValues,
  type InsertRequestInput,
} from "@/types/request"
import type { OfferType, PropertyType } from "@/types/property"

const OFFER_TYPES: OfferType[] = ["sale", "rent"]

export function AddRequestDialog() {
  const [open, setOpen] = useState(false)
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const t = useTranslations("requests")
  const tFields = useTranslations("fields")
  const tProps = useTranslations("properties")
  const tPlaceholders = useTranslations("placeholders")
  const tErrors = useTranslations("errors")
  const { propertyType, offerType } = usePropertyLabels()

  const form = useForm<InsertRequestFormValues>({
    resolver: zodResolver(
      insertRequestSchema
    ) as Resolver<InsertRequestFormValues>,
    defaultValues: {
      type: "villa",
      custom_property_type: "",
      offer_type: "sale",
      city: "",
      neighborhood: "",
      custom_neighborhood: "",
      details: "",
    },
  })

  const selectedCity = form.watch("city")
  const selectedType = form.watch("type")
  const selectedNeighborhood = form.watch("neighborhood")
  const showCustomType = isPropertyTypeOther(selectedType)
  const showCustomNeighborhood = isNeighborhoodOther(selectedNeighborhood)
  const neighborhoods = getNeighborhoodsForCity(selectedCity)

  async function onSubmit(values: InsertRequestFormValues) {
    const parsed = insertRequestSchema.safeParse(values)

    if (!parsed.success) {
      toast.error(tErrors("fixFields"))
      return
    }

    const result = await addRequest(parsed.data as InsertRequestInput)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success(t("toastPosted"))
    form.reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 sm:w-auto">
          <PlusCircleIcon className="size-4" />
          {t("postNew")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                    <Popover
                      open={neighborhoodOpen}
                      onOpenChange={setNeighborhoodOpen}
                    >
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
                      <PopoverContent
                        className="w-(--radix-popover-trigger-width) p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder={tPlaceholders("searchNeighborhood")}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {tPlaceholders("noNeighborhood")}
                            </CommandEmpty>
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
            </div>

            <FormField
              control={form.control}
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

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? t("posting") : t("postRequest")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
