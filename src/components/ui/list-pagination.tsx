"use client"

import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ListPaginationProps = {
  page: number
  hasMore: boolean
  total: number | null
  /** Query params to preserve (filters). `page` is overwritten. */
  searchParams?: Record<string, string | string[] | undefined>
  className?: string
  prevLabel?: string
  nextLabel?: string
}

function buildHref(
  page: number,
  searchParams?: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams()
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue
      const raw = Array.isArray(value) ? value[0] : value
      if (raw) params.set(key, raw)
    }
  }
  if (page > 1) {
    params.set("page", String(page))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : "?"
}

export function ListPagination({
  page,
  hasMore,
  total,
  searchParams,
  className,
  prevLabel,
  nextLabel,
}: ListPaginationProps) {
  const t = useTranslations("common")
  const prev = prevLabel ?? t("previous")
  const next = nextLabel ?? t("next")

  if (page <= 1 && !hasMore) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t pt-4",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total != null
          ? t("pageOfTotal", { page, total })
          : t("pageOnly", { page })}
      </p>
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page <= 1}
          className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
        >
          <Link href={buildHref(Math.max(1, page - 1), searchParams)}>
            {prev}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={!hasMore}
          className={!hasMore ? "pointer-events-none opacity-50" : undefined}
        >
          <Link href={buildHref(page + 1, searchParams)}>{next}</Link>
        </Button>
      </div>
    </div>
  )
}
