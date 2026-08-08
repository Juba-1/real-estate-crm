"use client"

import { useState } from "react"
import type { Control } from "react-hook-form"
import { useFormContext, useWatch } from "react-hook-form"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  FormControl,
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
import { isNeighborhoodOther } from "@/lib/constants/property-types"
import { CITY_OTHER_OPTION, isCityOther } from "@/lib/dictionary-ui"
import { cn } from "@/lib/utils"
import type { InsertRequestFormValues } from "@/types/request"

type RequestLocationFieldsProps = {
  control: Control<InsertRequestFormValues>
  cities: string[]
  customCity: string
  onCustomCityChange: (value: string) => void
  districtOptions: string[]
}

export function RequestLocationFields({
  control,
  cities,
  customCity,
  onCustomCityChange,
  districtOptions,
}: RequestLocationFieldsProps) {
  const { setValue } = useFormContext<InsertRequestFormValues>()
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false)
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tDict = useTranslations("dictionary")

  const selectedCity = useWatch({ control, name: "city" })
  const selectedNeighborhood = useWatch({ control, name: "neighborhood" })
  const showCustomCity = isCityOther(selectedCity)
  const showCustomNeighborhood = isNeighborhoodOther(selectedNeighborhood)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{tFields("city")}</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value)
                setValue("neighborhood", "")
                setValue("custom_neighborhood", "")
                if (!isCityOther(value)) {
                  onCustomCityChange("")
                }
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tPlaceholders("selectCity")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
                <SelectItem value={CITY_OTHER_OPTION}>
                  {tDict("otherOption")}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {showCustomCity ? (
        <FormItem>
          <FormLabel>{tDict("customCity")}</FormLabel>
          <Input
            placeholder={tDict("customCityPlaceholder")}
            value={customCity}
            onChange={(event) => onCustomCityChange(event.target.value)}
          />
        </FormItem>
      ) : null}

      <FormField
        control={control}
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
                    disabled={!selectedCity || isCityOther(selectedCity)}
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
                      {districtOptions.map((neighborhood) => (
                        <CommandItem
                          key={neighborhood}
                          value={neighborhood}
                          onSelect={() => {
                            field.onChange(neighborhood)
                            if (!isNeighborhoodOther(neighborhood)) {
                              setValue("custom_neighborhood", "")
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
          control={control}
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
  )
}
