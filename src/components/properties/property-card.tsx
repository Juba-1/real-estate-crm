"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Building2Icon,
  Loader2Icon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"

import { deleteProperty } from "@/actions/property"
import { updatePropertyStatus } from "@/actions/property-status"
import { RequestPropertyRemovalDialog } from "@/components/properties/request-property-removal-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import { Link } from "@/i18n/navigation"
import type { MyProperty } from "@/lib/data/properties"
import { formatListingDate } from "@/lib/format-listing-date"
import {
  getPropertyStatusBadgeClassName,
  URGENT_BADGE_CLASS,
} from "@/lib/ui/badge-styles"
import { isCurrentlyUrgent } from "@/lib/urgent"
import { cn } from "@/lib/utils"
import type { PropertyStatus } from "@/types/property"

const STATUS_OPTIONS: PropertyStatus[] = [
  "available",
  "pending",
  "sold",
  "rented",
]

type PropertyCardProps = {
  property: MyProperty
  /** When true, show admin hard-delete override. Agents only request removal. */
  isAdmin?: boolean
  removalPending?: boolean
}

export function PropertyCard({
  property,
  isAdmin = false,
  removalPending = false,
}: PropertyCardProps) {
  const [soldDialogOpen, setSoldDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(property.status)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const locale = useLocale()
  const { propertyType, offerType, status, formatPrice } = usePropertyLabels()
  const t = useTranslations("properties")
  const tStatus = useTranslations("status")
  const tSold = useTranslations("soldDialog")
  const tUrgent = useTranslations("urgent")
  const listingDate = formatListingDate(property.created_at, locale)
  const isUrgent = isCurrentlyUrgent(property.urgent_until)

  useEffect(() => {
    setSelectedStatus(property.status)
  }, [property.status])

  const owner = property.property_owners[0]
  const thumbnail = property.images[0]
  const rooms =
    typeof property.specs?.rooms === "number" ? property.specs.rooms : null

  function handleStatusUpdate(
    newStatus: PropertyStatus,
    deleteImages: boolean
  ) {
    startTransition(async () => {
      const result = await updatePropertyStatus(
        property.id,
        newStatus,
        deleteImages,
        property.images
      )

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        tStatus("updated", { status: status(newStatus) })
      )
      setSelectedStatus(newStatus)
      setSoldDialogOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProperty(property.id)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastDeleted"))
      setDeleteDialogOpen(false)
      router.refresh()
    })
  }

  function handleStatusSelect(value: string) {
    const newStatus = value as PropertyStatus

    if (newStatus === property.status) {
      return
    }

    if (newStatus === "sold") {
      setSelectedStatus("sold")
      setSoldDialogOpen(true)
      return
    }

    setSelectedStatus(newStatus)
    handleStatusUpdate(newStatus, false)
  }

  function handleSoldDialogChange(open: boolean) {
    setSoldDialogOpen(open)

    if (!open && property.status !== "sold") {
      setSelectedStatus(property.status)
    }
  }

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden pt-0",
          isUrgent && "border-t-4 border-t-destructive"
        )}
      >
        <div className="relative aspect-[16/10] w-full bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={`${property.city} ${property.neighborhood}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Building2Icon className="size-10" />
            </div>
          )}

          <div className="absolute left-3 top-3 z-10">
            <span className="rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur-sm">
              {listingDate}
            </span>
          </div>

          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
            {isUrgent ? (
              <Badge className={URGENT_BADGE_CLASS}>
                {tUrgent("badge")}
              </Badge>
            ) : null}
            <Badge className={cn(getPropertyStatusBadgeClassName(property.status))}>
              {status(property.status)}
            </Badge>
            <Badge variant="secondary">
              {offerType(property.offer_type)}
            </Badge>
          </div>
        </div>

        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-semibold">
                {formatPrice(Number(property.price))}
              </p>
              <p className="text-sm text-muted-foreground">
                {property.city}, {property.neighborhood}
              </p>
            </div>
            <Badge variant="outline">
              {propertyType(property.type, property.custom_property_type)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">{t("area")}:</span>{" "}
            {Number(property.area)} {t("areaUnit")}
          </p>
          {rooms !== null ? (
            <p>
              <span className="text-muted-foreground">{t("rooms")}:</span>{" "}
              {rooms}
            </p>
          ) : null}
        </CardContent>

        {owner ? (
          <CardContent className="border-t bg-amber-500/5 py-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-amber-800 uppercase dark:text-amber-300">
              {t("confidentialOwner")}
            </p>
            <p className="text-sm font-medium">{owner.owner_name}</p>
            <p className="text-sm text-muted-foreground">{owner.owner_phone}</p>
          </CardContent>
        ) : null}

        <CardFooter className="flex-col gap-3 border-t bg-muted/20">
          <div className="flex w-full flex-wrap gap-2">
            {property.google_maps_url ? (
              <Button asChild variant="secondary" size="sm" className="gap-2">
                <a
                  href={property.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPinIcon className="size-4" />
                  {t("viewLocation")}
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/dashboard/properties/${property.id}/edit`}>
                <PencilIcon className="size-4" />
                {t("edit")}
              </Link>
            </Button>
            <RequestPropertyRemovalDialog
              propertyId={property.id}
              disabled={isPending}
              alreadyPending={removalPending}
            />
            {isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-destructive"
                disabled={isPending}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon className="size-4" />
                {t("delete")}
              </Button>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t("changeStatus")}</p>
            <Select
              value={selectedStatus}
              onValueChange={handleStatusSelect}
              disabled={isPending}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {status(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPending ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              {t("updatingStatus")}
            </div>
          ) : null}
        </CardFooter>
      </Card>

      <AlertDialog open={soldDialogOpen} onOpenChange={handleSoldDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tSold("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tSold("description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleStatusUpdate("sold", false)}
            >
              {tSold("keepImages")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => handleStatusUpdate("sold", true)}
            >
              {tSold("deleteImages")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("deleteCancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {t("deleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
