"use client"

import type { ReactNode } from "react"
import type { Control } from "react-hook-form"
import { useTranslations } from "next-intl"

import { MarkUrgentField } from "@/components/forms/mark-urgent-field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  shouldShowAge,
  shouldShowAnnexField,
  shouldShowApartmentIdentityFields,
  shouldShowBuildingFields,
  shouldShowLandFields,
  shouldShowRooms,
  shouldShowStreetWidth,
} from "@/lib/constants/property-types"
import type { InsertPropertyFormValues } from "@/types/property"

type PropertyDetailsSectionProps = {
  control: Control<InsertPropertyFormValues>
  selectedType: string
  isDirect: boolean
  onMarkUrgentToggle: (checked: boolean) => void
  /** Maps / media blocks rendered after notes (same details Card). */
  children?: ReactNode
}

export function PropertyDetailsSection({
  control,
  selectedType,
  isDirect,
  onMarkUrgentToggle,
  children,
}: PropertyDetailsSectionProps) {
  const t = useTranslations("addProperty")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailsTitle")}</CardTitle>
        <CardDescription>{t("detailsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <MarkUrgentField
          control={control}
          hintKey="markHintProperty"
          onCheckedChange={onMarkUrgentToggle}
        />

        <FormField
          control={control}
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
            control={control}
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
                control={control}
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
                control={control}
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

              <FormField
                control={control}
                name="plot_letter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("plotLetter")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("plotLetter")}
                        maxLength={20}
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
                control={control}
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
                control={control}
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
                control={control}
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
              control={control}
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
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {shouldShowApartmentIdentityFields(selectedType) ? (
            <>
              <FormField
                control={control}
                name="specs.floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("floor")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={tPlaceholders("floor")}
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
                control={control}
                name="specs.project_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("projectName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={tPlaceholders("projectName")}
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

          {shouldShowAge(selectedType) ? (
            <FormField
              control={control}
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
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {shouldShowStreetWidth(selectedType) ? (
            <FormField
              control={control}
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
                      onChange={(event) => field.onChange(event.target.value)}
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
            control={control}
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
          control={control}
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
          control={control}
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

        {children}
      </CardContent>
    </Card>
  )
}
