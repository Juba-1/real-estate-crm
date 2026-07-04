"use client"

import { useEffect, useState, useTransition } from "react"
import { Building2Icon, Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"

import { deleteProperty } from "@/actions/property"
import { updatePropertyStatus } from "@/actions/property-status"
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
import { cn } from "@/lib/utils"
import type { PropertyStatus } from "@/types/property"

const STATUS_OPTIONS: PropertyStatus[] = [
  "available",
  "pending",
  "sold",
  "rented",
]

function getStatusBadgeClassName(status: PropertyStatus) {
  switch (status) {
    case "available":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    case "pending":
      return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
    case "sold":
      return "border-destructive/30 bg-destructive/15 text-destructive"
    case "rented":
      return "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300"
    default:
      return ""
  }
}

type PropertyCardProps = {
  property: MyProperty
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [soldDialogOpen, setSoldDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(property.status)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { propertyType, offerType, status, formatPrice } = usePropertyLabels()
  const t = useTranslations("properties")
  const tStatus = useTranslations("status")
  const tSold = useTranslations("soldDialog")

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
      <Card className="overflow-hidden pt-0">
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

          <div className="absolute start-3 top-3 flex flex-wrap gap-2">
            <Badge className={cn(getStatusBadgeClassName(property.status))}>
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
            <Badge variant="outline">{propertyType(property.type)}</Badge>
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
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/dashboard/properties/${property.id}/edit`}>
                <PencilIcon className="size-4" />
                {t("edit")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={isPending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-4" />
              {t("delete")}
            </Button>
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
